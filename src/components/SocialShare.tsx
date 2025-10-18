import { Button } from "@/components/ui/button";
import { Share2, Facebook, Twitter } from "lucide-react";
import { toast } from "sonner";

interface SocialShareProps {
  title: string;
  description: string;
  url: string;
}

const SocialShare = ({ title, description, url }: SocialShareProps) => {
  const shareUrl = encodeURIComponent(url);
  const shareTitle = encodeURIComponent(title);
  const shareDescription = encodeURIComponent(description);

  const handleWhatsAppShare = () => {
    const text = `${title}\n\n${description}\n\n${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
    toast.success("Opening WhatsApp...");
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`;
    window.open(twitterUrl, "_blank", "width=600,height=400");
    toast.success("Opening Twitter...");
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareTitle}`;
    window.open(facebookUrl, "_blank", "width=600,height=400");
    toast.success("Opening Facebook...");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleWhatsAppShare}
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4 text-green-600" />
        WhatsApp
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleTwitterShare}
        className="flex items-center gap-2"
      >
        <Twitter className="h-4 w-4 text-blue-400" />
        Twitter
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleFacebookShare}
        className="flex items-center gap-2"
      >
        <Facebook className="h-4 w-4 text-blue-600" />
        Facebook
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyLink}
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        Copy Link
      </Button>
    </div>
  );
};

export default SocialShare;
