import { isCatalogProposal, normalizeCatalogProposal } from '@/features/service-catalog/proposal';
import { proposalFormSchema } from '@/features/proposals/schemas/proposal';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/features/auth/services/get-user";
import { createClient } from "@/lib/supabase/server";
import { proposalSchema } from "@/features/proposals/schemas/proposal";
import {
  DESIGN_NOT_ENTITLED_MESSAGE,
  userCanAccessTemplate,
} from "@/lib/templates/design-entitlement";
import { Database } from "@/types/database";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];
type ProposalUpdate = Database["public"]["Tables"]["proposals"]["Update"];

// GET /api/proposals/[id] - Get a specific proposal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { user } = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: proposal, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Proposal not found" },
          { status: 404 },
        );
      }
      console.error("Error fetching proposal:", error);
      return NextResponse.json(
        { error: "Failed to fetch proposal" },
        { status: 500 },
      );
    }

    return NextResponse.json({ proposal });
  } catch (error) {
    console.error("Error in GET /api/proposals/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/proposals/[id] - Update a specific proposal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { user } = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = proposalSchema.partial().safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    let updateData = validationResult.data;

    // Without this, the create-route guard is bypassable in two steps: save
    // with an entitled design, then PUT the locked one.
    if (
      updateData.template_id &&
      !(await userCanAccessTemplate(user.id, updateData.template_id))
    ) {
      return NextResponse.json(
        { error: DESIGN_NOT_ENTITLED_MESSAGE },
        { status: 403 },
      );
    }

    const supabase = await createClient();

    // First check if the proposal exists and belongs to the user
    const { data: existingProposal, error: fetchError } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Proposal not found" },
          { status: 404 },
        );
      }
      console.error("Error checking proposal:", fetchError);
      return NextResponse.json(
        { error: "Failed to check proposal" },
        { status: 500 },
      );
    }

    if (isCatalogProposal(existingProposal) || isCatalogProposal(updateData)) {
      if (updateData.service_specific_data && !isCatalogProposal(updateData))
        return NextResponse.json({ error: 'Catalog metadata cannot be removed.' }, { status: 422 });
      const merged = proposalFormSchema.parse({ ...existingProposal, ...updateData, template_id: updateData.template_id ?? existingProposal.template_id ?? undefined });
      updateData = normalizeCatalogProposal(merged);
    }

    // Update the proposal
    const proposalUpdate: ProposalUpdate = {
      ...updateData,
      ...(isCatalogProposal(updateData) && updateData.global_inputs ? {
        client_name: updateData.global_inputs.client_name,
        client_email: updateData.global_inputs.client_email,
        client_company: updateData.global_inputs.client_company,
        contact_phone: updateData.global_inputs.contact_phone,
        service_location: updateData.global_inputs.service_location,
        facility_size: updateData.global_inputs.facility_size,
        service_frequency: updateData.global_inputs.service_frequency,
      } : {}),
      updated_at: new Date().toISOString(),
    };

    const { data: proposal, error } = await supabase
      .from("proposals")
      .update(proposalUpdate)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating proposal:", error);
      return NextResponse.json(
        { error: "Failed to update proposal" },
        { status: 500 },
      );
    }

    return NextResponse.json({ proposal });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid catalog inputs", details: error.issues }, { status: 422 });
    console.error("Error in PUT /api/proposals/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/proposals/[id] - Delete a specific proposal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { user } = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // First check if the proposal exists and belongs to the user
    const { data: existingProposal, error: fetchError } = await supabase
      .from("proposals")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Proposal not found" },
          { status: 404 },
        );
      }
      console.error("Error checking proposal:", fetchError);
      return NextResponse.json(
        { error: "Failed to check proposal" },
        { status: 500 },
      );
    }

    // Delete the proposal
    const { error } = await supabase
      .from("proposals")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting proposal:", error);
      return NextResponse.json(
        { error: "Failed to delete proposal" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Proposal deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/proposals/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
