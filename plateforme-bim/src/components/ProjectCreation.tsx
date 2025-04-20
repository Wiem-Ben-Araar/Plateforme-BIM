"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Plus } from "lucide-react";

export default function ProjectCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const project = await response.json();
        router.push(`/projects/${project._id}`);
      } else {
        throw new Error("Erreur création projet");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la création du projet");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nom du projet</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          placeholder="Entrez le nom du projet"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Description du projet (optionnel)"
          rows={4}
        />
      </div>

      <Button type="submit" disabled={isCreating} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        {isCreating ? "Création en cours..." : "Créer le projet"}
      </Button>
    </form>
  );
}