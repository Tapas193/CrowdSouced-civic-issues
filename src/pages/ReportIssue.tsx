import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Camera, MapPin } from "lucide-react";
import Navigation from "@/components/Navigation";

const ReportIssue = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    address: "",
  });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          toast.success("Location captured");
        },
        (error) => {
          toast.error("Unable to get your location");
        }
      );
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    try {
      let photoUrl = null;

      if (photo) {
        const fileExt = photo.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("issue-photos")
          .upload(fileName, photo);

        if (uploadError) {
          toast.error("Failed to upload photo");
          setLoading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("issue-photos")
          .getPublicUrl(fileName);

        photoUrl = publicUrl;
      }

      const { error } = await supabase.from("issues").insert([{
        user_id: userId,
        title: formData.title,
        description: formData.description,
        category: formData.category as any,
        address: formData.address,
        latitude: location?.lat,
        longitude: location?.lng,
        photo_url: photoUrl,
        priority_score: 0,
      }]);

      if (error) throw error;

      await supabase.rpc("award_points", {
        p_user_id: userId,
        p_points: 10,
      });

      toast.success("Issue reported! +10 points");
      navigate("/issues");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit issue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />
      <div className="bg-gradient-hero text-white p-6">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/20 mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Report an Issue</h1>
        <p className="text-white/90 mt-2">Help improve your community</p>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6 bg-card rounded-xl p-6 shadow-lg">
          <div className="space-y-2">
            <Label htmlFor="title">Issue Title *</Label>
            <Input
              id="title"
              placeholder="Brief description of the issue"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="roads">Roads & Infrastructure</SelectItem>
                <SelectItem value="lighting">Street Lighting</SelectItem>
                <SelectItem value="waste">Waste Management</SelectItem>
                <SelectItem value="water">Water & Drainage</SelectItem>
                <SelectItem value="parks">Parks & Recreation</SelectItem>
                <SelectItem value="safety">Public Safety</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Provide detailed information about the issue"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Location</Label>
            <div className="flex gap-2">
              <Input
                id="address"
                placeholder="Street address or landmark"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={getLocation}
                className="shrink-0"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Use GPS
              </Button>
            </div>
            {location && (
              <p className="text-sm text-muted-foreground">
                GPS: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo">Photo (Optional)</Label>
            <div className="mt-2">
              <input
                type="file"
                id="photo"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("photo")?.click()}
                className="w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
                {photo ? "Change Photo" : "Take/Upload Photo"}
              </Button>
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="mt-4 w-full rounded-lg max-h-64 object-cover"
                />
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary-hover"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Report"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ReportIssue;
