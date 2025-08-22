import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type BillTemplate = Database['public']['Tables']['bill_templates']['Row'];

const fieldSchema = z.object({
  field_name: z.string().min(1, "Field name is required"),
  field_type: z.enum(["text", "number", "date"]),
});

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  fields: z.array(fieldSchema).min(1, "At least one field is required"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface AddTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  template: BillTemplate | null;
}

export function AddTemplateDialog({
  isOpen,
  onClose,
  onSave,
  template,
}: AddTemplateDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      fields: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fields",
  });

  useEffect(() => {
    if (isOpen) {
      if (template) {
        // Fetch fields for the template and reset the form
      } else {
        reset({
          name: "",
          fields: [{ field_name: "", field_type: "text" }],
        });
      }
    }
  }, [template, isOpen, reset]);

  const onSubmit = async (data: TemplateFormData) => {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to create a template.", variant: "destructive" });
        return;
    }

    // Insert into bill_templates
    const { data: templateData, error: templateError } = await supabase
      .from("bill_templates")
      .insert({ name: data.name, user_id: user.id })
      .select()
      .single();

    if (templateError || !templateData) {
      toast({ title: "Error creating template", description: templateError?.message || "An unexpected error occurred.", variant: "destructive" });
      return;
    }

    // Insert into template_fields
    const fieldsToInsert = data.fields.map(field => ({
        template_id: templateData.id,
        ...field
    }));

    const { error: fieldsError } = await supabase.from("template_fields").insert(fieldsToInsert);

    if (fieldsError) {
        toast({ title: "Error saving template fields", description: fieldsError.message, variant: "destructive" });
        return;
    }

    toast({ title: "Template saved", description: "The template has been saved successfully." });
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create New Template"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div>
            <Label htmlFor="name">Template Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-4">
            <Label>Fields</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-11 gap-2 items-center">
                <Input {...register(`fields.${index}.field_name`)} placeholder="Field Name" className="col-span-5" />
                <Select onValueChange={(value) => setValue(`fields.${index}.field_type`, value as "text" | "number" | "date")}>
                  <SelectTrigger className="col-span-5">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="col-span-1">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {errors.fields && <p className="text-red-500 text-sm">{errors.fields.message}</p>}
            <Button type="button" variant="outline" onClick={() => append({ field_name: "", field_type: "text" })}>
              Add Field
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}