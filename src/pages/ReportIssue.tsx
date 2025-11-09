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
import { z } from "zod";

const issueSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().trim().min(1, "Description is required").max(2000, "Description must be less than 2000 characters"),
  category: z.string().min(1, "Category is required"),
  address: z.string().trim().max(500, "Address must be less than 500 characters").optional(),
});

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
  const [imageAnalysis, setImageAnalysis] = useState<{ verdict: string; explanation: string } | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (role?.role === "admin") {
        toast.error("Admins cannot report issues");
        navigate("/admin");
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);
        
        // Analyze image if form has content
        if (formData.title && formData.description && formData.category) {
          await analyzeImage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (imageBase64: string) => {
    if (!formData.title || !formData.description || !formData.category) {
      return;
    }

    setAnalyzingImage(true);
    setImageAnalysis(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-issue-image', {
        body: {
          imageBase64,
          title: formData.title,
          description: formData.description,
          category: formData.category
        }
      });

      if (error) throw error;

      if (data?.analysis) {
        setImageAnalysis(data.analysis);
        
        if (data.analysis.verdict === 'appropriate') {
          toast.success('✓ Image looks good!');
        } else if (data.analysis.verdict === 'unclear') {
          toast('⚠️ Image quality could be better', {
            description: data.analysis.explanation
          });
        } else if (data.analysis.verdict === 'irrelevant') {
          toast.error('⚠️ Image may not match the issue', {
            description: data.analysis.explanation
          });
        }
      }
    } catch (error: any) {
      console.error('Image analysis error:', error);
      toast.error('Could not analyze image');
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    // Validate inputs
    const validationResult = issueSchema.safeParse(formData);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setLoading(true);
    try {
      const validData = validationResult.data;
      // Get AI-assigned department
      const { data: deptData } = await supabase.functions.invoke('assign-department', {
        body: { title: validData.title, description: validData.description, category: validData.category }
      });

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
        title: validData.title,
        description: validData.description,
        category: validData.category as any,
        address: validData.address || "",
        latitude: location?.lat,
        longitude: location?.lng,
        photo_url: photoUrl,
        priority_score: 0,
        assigned_department: deptData?.department || 'Public Works',
      }]);

      if (error) throw error;

      await supabase.rpc("award_points", {
        p_user_id: userId,
        p_points: 10,
      });

      toast.success(`Issue reported and assigned to ${deptData?.department || 'Public Works'}! +10 points`);
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
                {photo ? "Retake Photo" : "Take Photo"}
              </Button>
              {photoPreview && (
                <div className="mt-4 space-y-3">
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full rounded-lg max-h-64 object-cover"
                    />
                    {analyzingImage && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <div className="text-white text-sm">Analyzing image...</div>
                      </div>
                    )}
                  </div>
                  {imageAnalysis && (
                    <div className={`p-3 rounded-lg border ${
                      imageAnalysis.verdict === 'appropriate' 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                        : imageAnalysis.verdict === 'unclear'
                        ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
                        : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                    }`}>
                      <p className={`text-sm font-medium ${
                        imageAnalysis.verdict === 'appropriate' 
                          ? 'text-green-800 dark:text-green-200'
                          : imageAnalysis.verdict === 'unclear'
                          ? 'text-yellow-800 dark:text-yellow-200'
                          : 'text-red-800 dark:text-red-200'
                      }`}>
                        {imageAnalysis.verdict === 'appropriate' && '✓ Image verified'}
                        {imageAnalysis.verdict === 'unclear' && '⚠️ Image unclear'}
                        {imageAnalysis.verdict === 'irrelevant' && '✗ Image may not match issue'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {imageAnalysis.explanation}
                      </p>
                    </div>
                  )}
                </div>
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
