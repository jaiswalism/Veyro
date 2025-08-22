import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];

const profileSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gst_registered: z.boolean().default(false),
  gst_number: z.string().optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
        gst_registered: false,
    }
  });

  const gstRegistered = watch("gst_registered");

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setProfile(data);
          reset(data);
        }
      }
    };
    fetchProfile();
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .upsert({ ...data, user_id: user.id }, {
            onConflict: 'user_id',
        });

      if (error) {
        toast({
          title: "Error updating profile",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profile updated",
          description: "Your company information has been saved.",
        });
      }
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your company information for billing.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>
            This information will appear on your invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input id="company_name" {...register("company_name")} />
              {errors.company_name && (
                <p className="text-red-500 text-sm">{errors.company_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="gst_registered" checked={gstRegistered} onCheckedChange={(checked) => setValue("gst_registered", checked)} />
                <Label htmlFor="gst_registered">GST Registered?</Label>
            </div>
            {gstRegistered && (
                <div className="space-y-2">
                    <Label htmlFor="gst_number">GST Number</Label>
                    <Input id="gst_number" {...register("gst_number")} />
                </div>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}