import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in react-leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const MapView = () => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (!error && data) {
      setIssues(data);
    }
    setLoading(false);
  };

  const statusColors = {
    pending: "bg-status-pending",
    in_progress: "bg-status-inProgress",
    resolved: "bg-status-resolved",
    rejected: "bg-status-rejected",
  };

  const getMarkerColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "#10b981";
      case "in_progress":
        return "#f59e0b";
      case "rejected":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const createCustomIcon = (status: string) => {
    const color = getMarkerColor(status);
    return L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 12],
    });
  };

  // Default center (India center coordinates)
  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const defaultZoom = 5;

  if (loading) {
    return (
      <div className="min-h-screen bg-muted">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <MapPin className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
            <p className="text-lg text-muted-foreground">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">Issues Map</h1>
          <p className="text-muted-foreground">
            Explore reported issues across your city on an interactive map
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: "calc(100vh - 250px)" }}>
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MarkerClusterGroup>
              {issues.map((issue) => (
                <Marker
                  key={issue.id}
                  position={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}
                  icon={createCustomIcon(issue.status)}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-bold text-lg mb-2">{issue.title}</h3>
                      <Badge className={`${statusColors[issue.status as keyof typeof statusColors]} mb-2`}>
                        {issue.status}
                      </Badge>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {issue.description}
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        📍 {issue.address}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/issues/${issue.id}`)}
                        className="w-full"
                      >
                        View Details
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>

        <div className="mt-4 flex gap-4 justify-center flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#6b7280" }}></div>
            <span className="text-sm">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#f59e0b" }}></div>
            <span className="text-sm">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#10b981" }}></div>
            <span className="text-sm">Resolved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#ef4444" }}></div>
            <span className="text-sm">Rejected</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
