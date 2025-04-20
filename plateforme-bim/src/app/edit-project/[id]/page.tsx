import EditProjectForm from "@/components/EditProjectForm"; // Nous allons créer ce composant séparément

export default function EditProjectPage({ params }: { params: { id: string } }) {
  return <EditProjectForm projectId={params.id} />;
}