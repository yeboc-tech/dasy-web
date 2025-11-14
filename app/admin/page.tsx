import { redirect } from "next/navigation";

export default function AdminPage() {
  // Redirect to label types management
  redirect('/admin/label-types');
}
