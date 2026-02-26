import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Copy, FileText, CheckCircle, Pencil } from "lucide-react";
import type { ContractTemplate } from "@/types/database";

const TEMPLATE_TYPES = ["MSA", "SOW", "Exhibit"] as const;

export default function ContractTemplatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contract_templates")
      .select("*")
      .order("type")
      .order("version", { ascending: false });

    if (error) {
      toast.error("Failed to load templates");
      console.error(error);
    } else {
      setTemplates(data ?? []);
    }
    setLoading(false);
  }

  function groupedByType(type: string): ContractTemplate[] {
    return templates.filter(
      (t) => t.type.toLowerCase() === type.toLowerCase()
    );
  }

  async function handleCreateTemplate(type: string) {
    const { data, error } = await supabase
      .from("contract_templates")
      .insert({
        type: type.toLowerCase(),
        name: `New ${type} Template`,
        content: {},
        version: 1,
        is_active: false,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create template");
      console.error(error);
      return;
    }

    toast.success("Template created");
    navigate(`/admin/settings/templates/${data.id}`);
  }

  async function handleDuplicate(template: ContractTemplate) {
    const maxVersion = templates
      .filter((t) => t.type === template.type)
      .reduce((max, t) => Math.max(max, t.version), 0);

    const { data, error } = await supabase
      .from("contract_templates")
      .insert({
        type: template.type,
        name: template.name,
        content: template.content,
        version: maxVersion + 1,
        is_active: false,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to duplicate template");
      console.error(error);
      return;
    }

    toast.success("Template duplicated");
    navigate(`/admin/settings/templates/${data.id}`);
  }

  async function handleSetActive(template: ContractTemplate) {
    // First, deactivate any currently active template of the same type
    const { error: deactivateError } = await supabase
      .from("contract_templates")
      .update({ is_active: false })
      .eq("type", template.type)
      .eq("is_active", true);

    if (deactivateError) {
      toast.error("Failed to update templates");
      console.error(deactivateError);
      return;
    }

    // Then activate the selected template
    const { error: activateError } = await supabase
      .from("contract_templates")
      .update({ is_active: true })
      .eq("id", template.id);

    if (activateError) {
      toast.error("Failed to activate template");
      console.error(activateError);
      return;
    }

    toast.success(`${template.name} is now the active ${template.type.toUpperCase()} template`);
    fetchTemplates();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <PageWrapper
      title="Contract Templates"
      description="Manage contract document templates."
    >
      <div className="flex justify-end mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {TEMPLATE_TYPES.map((type) => (
              <DropdownMenuItem
                key={type}
                onClick={() => handleCreateTemplate(type)}
              >
                <FileText className="h-4 w-4 mr-2" />
                {type}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading templates...
        </div>
      ) : (
        <Tabs defaultValue="msa">
          <TabsList>
            {TEMPLATE_TYPES.map((type) => (
              <TabsTrigger key={type} value={type.toLowerCase()}>
                {type}
              </TabsTrigger>
            ))}
          </TabsList>

          {TEMPLATE_TYPES.map((type) => (
            <TabsContent key={type} value={type.toLowerCase()}>
              <div className="grid gap-4 mt-4">
                {groupedByType(type).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No {type} templates yet. Create one to get started.
                  </div>
                ) : (
                  groupedByType(type).map((template) => (
                    <Card key={template.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {template.name}
                              </span>
                              <Badge variant="outline">v{template.version}</Badge>
                              {template.is_active ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Created {formatDate(template.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!template.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetActive(template)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Set as Active
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicate(template)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Duplicate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/admin/settings/templates/${template.id}`
                              )
                            }
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </PageWrapper>
  );
}
