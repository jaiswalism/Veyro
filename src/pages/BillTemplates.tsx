import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AddTemplateDialog } from "@/components/templates/AddTemplateDialog";

type BillTemplate = Database['public']['Tables']['bill_templates']['Row'];

export default function BillTemplates() {
  const [templates, setTemplates] = useState<BillTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BillTemplate | null>(null);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("bill_templates").select("*");

    if (error) {
      toast({
        title: "Error fetching templates",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (templateId: number) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      const { error } = await supabase.from("bill_templates").delete().eq("id", templateId);
      if (error) {
        toast({
          title: "Error deleting template",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Template deleted",
          description: "The template has been successfully deleted.",
        });
        fetchTemplates();
      }
    }
  };

  const handleSave = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    fetchTemplates();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bill Templates</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage custom templates for your bills.
          </p>
        </div>
        <Button className="mt-4 sm:mt-0" onClick={() => { setEditingTemplate(null); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">All Templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 2 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-10" /></TableCell>
                    </TableRow>
                  ))
                ) : templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{template.name}</p>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingTemplate(template); setIsDialogOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Template
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(template.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Template
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <AddTemplateDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        template={editingTemplate}
      />
      
    </div>
  );
}