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
import { Plus, Copy, FileText, CheckCircle, Pencil, History, ChevronDown } from "lucide-react";
import type { ContractTemplate } from "@/types/database";

const TEMPLATE_TYPES = ["MSA", "SOW", "Exhibit"] as const;

type TemplateWithClauseCount = ContractTemplate & {
  contract_template_clauses?: [{ count: number }];
};

export default function ContractTemplatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TemplateWithClauseCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contract_templates")
      .select("*, contract_template_clauses(count)")
      .order("type")
      .order("version", { ascending: false });

    if (error) {
      toast.error("Failed to load templates");
      console.error(error);
    } else {
      setTemplates((data as TemplateWithClauseCount[]) ?? []);
    }
    setLoading(false);
  }

  function groupedByType(type: string): TemplateWithClauseCount[] {
    return templates.filter(
      (t) => t.type.toLowerCase() === type.toLowerCase()
    );
  }

  function getOlderVersions(type: string): TemplateWithClauseCount[] {
    const group = groupedByType(type);
    const active = group.find((t) => t.is_active);
    if (active) {
      return group.filter((t) => t.id !== active.id);
    }
    // If no active, first one is the "current" and the rest are older
    return group.slice(1);
  }

  function getCurrentTemplate(type: string): TemplateWithClauseCount | undefined {
    const group = groupedByType(type);
    return group.find((t) => t.is_active) ?? group[0];
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

  function toggleHistory(type: string) {
    setExpandedHistory((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  }

  function getClauseCount(template: TemplateWithClauseCount): number {
    return template.contract_template_clauses?.[0]?.count ?? 0;
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

          {TEMPLATE_TYPES.map((type) => {
            const current = getCurrentTemplate(type);
            const olderVersions = getOlderVersions(type);
            const isHistoryOpen = expandedHistory[type.toLowerCase()] ?? false;

            return (
              <TabsContent key={type} value={type.toLowerCase()}>
                <div className="grid gap-4 mt-4">
                  {groupedByType(type).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No {type} templates yet. Create one to get started.
                    </div>
                  ) : (
                    <>
                      {/* Current / Active template card */}
                      {current && (
                        <Card key={current.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {current.name}
                                  </span>
                                  <Badge variant="outline">v{current.version}</Badge>
                                  {current.is_active ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Inactive</Badge>
                                  )}
                                  <Badge variant="secondary" className="text-[10px]">
                                    {getClauseCount(current)} clauses
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Created {formatDate(current.created_at)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!current.is_active && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetActive(current)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Set as Active
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDuplicate(current)}
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                Duplicate
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    `/admin/settings/templates/${current.id}`
                                  )
                                }
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )}

                      {/* Non-active, non-current templates that aren't in the "older versions" */}
                      {groupedByType(type)
                        .filter((t) => t.id !== current?.id && !olderVersions.some((ov) => ov.id === t.id))
                        .map((template) => (
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
                                    <Badge variant="secondary" className="text-[10px]">
                                      {getClauseCount(template)} clauses
                                    </Badge>
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
                        ))}

                      {/* Version History Section */}
                      {olderVersions.length > 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleHistory(type.toLowerCase())}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <History className="h-3.5 w-3.5" />
                            <span>
                              {olderVersions.length} previous {olderVersions.length === 1 ? 'version' : 'versions'}
                            </span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {isHistoryOpen && (
                            <div className="mt-3 space-y-2 pl-5 border-l-2 border-muted">
                              {olderVersions.map((version) => (
                                <div
                                  key={version.id}
                                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group"
                                  onClick={() => navigate(`/admin/settings/templates/${version.id}`)}
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">{version.name}</span>
                                    <Badge variant="outline" className="text-[10px]">v{version.version}</Badge>
                                    <Badge variant="secondary" className="text-[10px]">
                                      {getClauseCount(version)} clauses
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(version.created_at)}
                                    </span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSetActive(version);
                                        }}
                                      >
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                        Activate
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDuplicate(version);
                                        }}
                                      >
                                        <Copy className="h-3.5 w-3.5 mr-1" />
                                        Duplicate
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </PageWrapper>
  );
}
