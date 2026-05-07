import React, { useMemo, useRef, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";

export interface MapPoint {
  latitude: number;
  longitude: number;
}

export interface MapMarker extends MapPoint {
  id: string;
  title?: string;
  emoji?: string;
}

export interface LeafletMapProps {
  center?: MapPoint;
  zoom?: number;
  markers?: MapMarker[];
  polyline?: MapPoint[];
  heatmap?: MapPoint[];
  followPolyline?: boolean;
  style?: any;
}

const DEFAULT_CENTER: MapPoint = { latitude: 41.9028, longitude: 12.4964 }; // Roma

function buildHtml(props: LeafletMapProps): string {
  const center = props.center ?? DEFAULT_CENTER;
  const zoom = props.zoom ?? 14;
  const markers = props.markers ?? [];
  const polyline = props.polyline ?? [];
  const heatmap = props.heatmap ?? [];

  const markersJs = JSON.stringify(markers);
  const polylineJs = JSON.stringify(polyline.map((p) => [p.latitude, p.longitude]));
  const heatmapJs = JSON.stringify(heatmap.map((p) => [p.latitude, p.longitude, 0.6]));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #e8eef1; }
  .pf-marker { font-size: 26px; line-height: 26px; text-align: center; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
<script>
  (function () {
    try {
      var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${center.latitude}, ${center.longitude}], ${zoom});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      var markers = ${markersJs};
      markers.forEach(function (m) {
        var icon = L.divIcon({
          html: '<div class="pf-marker">' + (m.emoji || '📍') + '</div>',
          iconSize: [32, 32],
          className: ''
        });
        var marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(map);
        if (m.title) marker.bindPopup(m.title);
      });

      var polyPoints = ${polylineJs};
      var polyline = null;
      if (polyPoints.length > 1) {
        polyline = L.polyline(polyPoints, { color: '#2D5A3D', weight: 5, opacity: 0.85 }).addTo(map);
        ${props.followPolyline ? "map.fitBounds(polyline.getBounds(), { padding: [20, 20] });" : ""}
      }

      var heatPoints = ${heatmapJs};
      if (heatPoints.length > 0 && L.heatLayer) {
        L.heatLayer(heatPoints, { radius: 28, blur: 22, maxZoom: 16 }).addTo(map);
      }

      window.__pfUpdate = function (payload) {
        try {
          var data = JSON.parse(payload);
          if (data.polyline && polyline) {
            polyline.setLatLngs(data.polyline);
            map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
          } else if (data.polyline) {
            polyline = L.polyline(data.polyline, { color: '#2D5A3D', weight: 5 }).addTo(map);
          }
          if (data.center) map.setView([data.center.latitude, data.center.longitude], data.zoom || map.getZoom());
        } catch (e) {}
      };

      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('ready');
    } catch (err) {
      document.body.innerHTML = '<div style="padding:24px;font-family:sans-serif;color:#B83A1F">Errore mappa: ' + err.message + '</div>';
    }
  })();
</script>
</body>
</html>`;
}

export function LeafletMap(props: LeafletMapProps) {
  const html = useMemo(() => buildHtml(props), [
    props.center?.latitude,
    props.center?.longitude,
    props.zoom,
    JSON.stringify(props.markers),
    JSON.stringify(props.heatmap),
  ]);
  const ref = useRef<WebView>(null);

  useEffect(() => {
    if (!props.polyline || props.polyline.length === 0) return;
    const payload = JSON.stringify({
      polyline: props.polyline.map((p) => [p.latitude, p.longitude]),
      center: props.followPolyline
        ? props.polyline[props.polyline.length - 1]
        : undefined,
      zoom: 17,
    });
    ref.current?.injectJavaScript(
      `window.__pfUpdate && window.__pfUpdate(${JSON.stringify(payload)}); true;`
    );
  }, [props.polyline, props.followPolyline]);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, props.style]}>
        {/* eslint-disable-next-line react/no-unknown-property */}
        <iframe srcDoc={html} style={{ border: 0, width: "100%", height: "100%" }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, props.style]}>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html }}
        style={{ flex: 1, backgroundColor: "#e8eef1" }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", borderRadius: 16 },
});
