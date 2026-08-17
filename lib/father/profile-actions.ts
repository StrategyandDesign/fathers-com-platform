"use server";

import { redirect } from "next/navigation";

export async function startProfile() {
  redirect("/father/assessments");
}

export async function retakeProfile() {
  redirect("/father/assessments");
}

export async function saveProfileProgress() {
  redirect("/father/assessments");
}

export async function saveAndExitProfile() {
  redirect("/father/assessments");
}
