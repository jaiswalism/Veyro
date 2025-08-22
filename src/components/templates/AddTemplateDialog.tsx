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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Trash2 } from "lucide-react";

type BillTemplate = Database['public']['Tables']['bill_templates']['Row'];

const fieldSchema = z.object({
  field_name: z.string().min(1, "Field name is required"),
  field_type: z.string().min(1, "Field type is required"),
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
  const {
    register,
    handleSubmit,
    reset,
    control,
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
    // Logic to save the template and its fields to Supabase
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
                <Input {...register(`fields.${index}.field_type`)} placeholder="Field Type" className="col-span-5" />
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