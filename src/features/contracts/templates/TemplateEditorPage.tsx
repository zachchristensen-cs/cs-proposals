import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import TipTapEditor from "@/components/shared/TipTapEditor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Save,
  Eye,
  Trash2,
  Plus,
  Variable,
} from "lucide-react";
import type { ContractTemplate, VariableSchemaField } from "@/types/database";

const VARIABLE_TYPES: VariableSchemaField["type"][] = [
  "text",
  "textarea",
  "number",
  "currency",
  "date",
  "select",
  "boolean",
];

const SOURCE_OPTIONS = [
  { value: "none", label: "(none)" },
  { value: "organization", label: "Organization" },
  { value: "proposal", label: "Proposal" },
  { value: "auto", label: "Auto" },
];

const TYPE_BADGE_COLORS: Record<string, string> = {
  msa: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  sow: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  exhibit:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

function extractVariablesFromContent(html: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    found.add(match[1]);
  }
  return Array.from(found);
}

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<ContractTemplate | null>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [variableSchema, setVariableSchema] = useState<
    Record<string, VariableSchemaField>
  >({});

  // Track which variables are used in content
  const [contentVariables, setContentVariables] = useState<Set<string>>(
    new Set()
  );

  // For the "Add Variable" prompt
  const [showAddVariable, setShowAddVariable] = useState(false);
  const [newVariableName, setNewVariableName] = useState("");
  const addVariableInputRef = useRef<HTMLInputElement>(null);

  // Fetch template on mount
  useEffect(() => {
    if (!id) return;
    fetchTemplate();
  }, [id]);

  async function fetchTemplate() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contract_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      toast.error("Failed to load template");
      console.error(error);
      setLoading(false);
      return;
    }

    const t = data as ContractTemplate;
    setTemplate(t);
    setName(t.name);
    setContent(typeof t.content === "string" ? t.content : "");
    setVariableSchema(t.variable_schema ?? {});

    // Initialize content variables
    const initialContent = typeof t.content === "string" ? t.content : "";
    setContentVariables(new Set(extractVariablesFromContent(initialContent)));

    setLoading(false);
  }

  // Handle content change from TipTap
  const handleContentChange = useCallback(
    (html: string) => {
      setContent(html);

      const foundVars = extractVariablesFromContent(html);
      setContentVariables(new Set(foundVars));

      // Auto-add any new variables found in content
      setVariableSchema((prev) => {
        const updated = { ...prev };
        let changed = false;
        for (const varName of foundVars) {
          if (!updated[varName]) {
            updated[varName] = {
              type: "text",
              label: varName
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()),
              required: false,
            };
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    },
    []
  );

  // Variable schema operations
  function updateVariable(
    varName: string,
    updates: Partial<VariableSchemaField>
  ) {
    setVariableSchema((prev) => ({
      ...prev,
      [varName]: { ...prev[varName], ...updates },
    }));
  }

  function removeVariable(varName: string) {
    setVariableSchema((prev) => {
      const updated = { ...prev };
      delete updated[varName];
      return updated;
    });
  }

  function handleAddVariable() {
    const trimmed = newVariableName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    if (!trimmed) {
      toast.error("Variable name cannot be empty");
      return;
    }

    if (variableSchema[trimmed]) {
      toast.error(`Variable "${trimmed}" already exists`);
      return;
    }

    setVariableSchema((prev) => ({
      ...prev,
      [trimmed]: {
        type: "text",
        label: trimmed
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        required: false,
      },
    }));

    setNewVariableName("");
    setShowAddVariable(false);
    toast.success(`Variable "{{${trimmed}}}" added`);
  }

  // Focus the input when the add variable form opens
  useEffect(() => {
    if (showAddVariable && addVariableInputRef.current) {
      addVariableInputRef.current.focus();
    }
  }, [showAddVariable]);

  // Save as new version
  async function handleSave() {
    if (!template || !user) return;

    setSaving(true);

    try {
      // Deactivate current template
      const { error: deactivateError } = await supabase
        .from("contract_templates")
        .update({ is_active: false })
        .eq("id", template.id);

      if (deactivateError) {
        toast.error("Failed to deactivate current version");
        console.error(deactivateError);
        setSaving(false);
        return;
      }

      // Get the max version for this template type + name
      const { data: versions, error: versionError } = await supabase
        .from("contract_templates")
        .select("version")
        .eq("type", template.type)
        .eq("name", name)
        .order("version", { ascending: false })
        .limit(1);

      if (versionError) {
        toast.error("Failed to determine version");
        console.error(versionError);
        setSaving(false);
        return;
      }

      const nextVersion = (versions?.[0]?.version ?? template.version) + 1;

      // Insert new version
      const { data: newTemplate, error: insertError } = await supabase
        .from("contract_templates")
        .insert({
          type: template.type,
          name,
          content,
          variable_schema: variableSchema,
          version: nextVersion,
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError || !newTemplate) {
        toast.error("Failed to save new version");
        console.error(insertError);
        setSaving(false);
        return;
      }

      toast.success(`Saved as version ${nextVersion}`);
      navigate(`/admin/settings/templates/${newTemplate.id}`, {
        replace: true,
      });
    } catch (err) {
      toast.error("An unexpected error occurred");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // Preview — open content in a new window
  function handlePreview() {
    // Replace variables with placeholder values for preview
    let previewContent = content;
    for (const [varName, field] of Object.entries(variableSchema)) {
      const placeholder =
        field.default != null
          ? String(field.default)
          : `[${field.label || varName}]`;
      previewContent = previewContent.replace(
        new RegExp(`\\{\\{${varName}\\}\\}`, "g"),
        `<span style="background:#fef3c7;padding:0 4px;border-radius:2px;">${placeholder}</span>`
      );
    }

    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Preview: ${name}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 0 20px;
              line-height: 1.6;
              color: #1a1a1a;
            }
            h1, h2, h3 { margin-top: 1.5em; }
            table { border-collapse: collapse; width: 100%; margin: 1em 0; }
            td, th { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; }
          </style>
        </head>
        <body>${previewContent}</body>
        </html>
      `);
      previewWindow.document.close();
    }
  }

  // Variable list sorted: used first, unused last
  const variableEntries = Object.entries(variableSchema).sort(
    ([a], [b]) => {
      const aUsed = contentVariables.has(a);
      const bUsed = contentVariables.has(b);
      if (aUsed && !bUsed) return -1;
      if (!aUsed && bUsed) return 1;
      return a.localeCompare(b);
    }
  );

  const variableNames = Object.keys(variableSchema);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading template...
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Template not found.</p>
        <Button variant="outline" asChild>
          <Link to="/admin/settings/templates">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/settings/templates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 w-64 font-medium"
          placeholder="Template name"
        />

        <Badge className={TYPE_BADGE_COLORS[template.type] ?? ""}>
          {template.type.toUpperCase()}
        </Badge>

        <Badge variant="outline">v{template.version}</Badge>

        {template.is_active && (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">
            Active
          </Badge>
        )}

        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={handlePreview}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>

        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save New Version"}
        </Button>
      </div>

      {/* Two-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel — TipTap Editor */}
        <div className="flex flex-col w-[60%] border-r">
          <div className="flex items-center gap-2 border-b px-4 py-2">
            <Variable className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Document Content
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <TipTapEditor
              content={content}
              onChange={handleContentChange}
              variables={variableNames}
              placeholder="Start writing your contract template..."
              className="h-full min-h-[calc(100vh-180px)]"
            />
          </div>
        </div>

        {/* Right Panel — Variable Schema Editor */}
        <div className="flex flex-col w-[40%]">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Variables</span>
              <Badge variant="secondary" className="text-xs">
                {variableEntries.length}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddVariable(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Variable
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Add Variable Form */}
            {showAddVariable && (
              <Card className="p-3 border-dashed border-2 border-primary/30">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    New Variable Name
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      ref={addVariableInputRef}
                      value={newVariableName}
                      onChange={(e) => setNewVariableName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddVariable();
                        if (e.key === "Escape") {
                          setShowAddVariable(false);
                          setNewVariableName("");
                        }
                      }}
                      placeholder="e.g. client_name"
                      className="h-8 text-sm font-mono"
                    />
                    <Button size="sm" onClick={handleAddVariable}>
                      Add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddVariable(false);
                        setNewVariableName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use snake_case. Only letters, numbers, and underscores.
                  </p>
                </div>
              </Card>
            )}

            {/* Variable Entries */}
            {variableEntries.length === 0 && !showAddVariable && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Variable className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No variables defined yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add variables manually or type{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                    {"{{variable_name}}"}
                  </code>{" "}
                  in the editor.
                </p>
              </div>
            )}

            {variableEntries.map(([varName, field]) => {
              const isUsed = contentVariables.has(varName);

              return (
                <Card
                  key={varName}
                  className={`p-3 space-y-3 transition-opacity ${
                    !isUsed ? "opacity-50 border-dashed" : ""
                  }`}
                >
                  {/* Variable Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {`{{${varName}}}`}
                      </code>
                      {!isUsed && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          Unused
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeVariable(varName)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Type */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Type
                      </Label>
                      <Select
                        value={field.type}
                        onValueChange={(val) =>
                          updateVariable(varName, {
                            type: val as VariableSchemaField["type"],
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VARIABLE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Source */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Source
                      </Label>
                      <Select
                        value={field.source ?? "none"}
                        onValueChange={(val) =>
                          updateVariable(varName, {
                            source:
                              val === "none"
                                ? undefined
                                : (val as VariableSchemaField["source"]),
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Label */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Label
                    </Label>
                    <Input
                      value={field.label}
                      onChange={(e) =>
                        updateVariable(varName, { label: e.target.value })
                      }
                      className="h-8 text-sm"
                      placeholder="Display label"
                    />
                  </div>

                  {/* Default Value (hidden for boolean) */}
                  {field.type !== "boolean" && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Default Value
                      </Label>
                      <Input
                        value={
                          field.default != null ? String(field.default) : ""
                        }
                        onChange={(e) =>
                          updateVariable(varName, {
                            default: e.target.value || undefined,
                          })
                        }
                        className="h-8 text-sm"
                        placeholder="Optional default"
                      />
                    </div>
                  )}

                  {/* Required Toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <Label className="text-xs text-muted-foreground">
                      Required
                    </Label>
                    <Switch
                      checked={field.required}
                      onCheckedChange={(checked) =>
                        updateVariable(varName, { required: checked })
                      }
                      size="sm"
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
