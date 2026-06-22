import { redirect } from "next/navigation";

export default function PresentazionePage() {
  redirect("/app?presentazione=1");
}
