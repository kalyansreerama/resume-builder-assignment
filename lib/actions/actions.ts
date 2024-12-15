"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma/db";
import { redirect } from "next/navigation";
import { Template } from "@prisma/client";
import { revalidatePath } from "next/cache";
import stripe from "stripe";

export const updateUser = async (resumeData: any) => {
	const session = await auth();
	if (!session) {
		return redirect("/login");
	}
	try {
    // Validate resume data (example schema validation could be added here):
    if (
      typeof resumeData !== "object" ||
      !resumeData.name ||
      !resumeData.skills
    ) {
      throw new Error("Invalid resume data.");
    }
    const updatedUser = await prisma.user.update({
      where: {
        email: session?.user?.email!,
      },
      data: {
        resumeProfile: resumeData,
      },
    });
    if (updatedUser) {
      return {
        status: "success",
        message: "Profile updated successfully",
      };
    }
  } catch (error) {
		return { status: "error", message: "Something went wrong" };
	}
};
export const createTemplate = async (template: any) => {
	try {
		// Check if template data is valid
		if (
      !template.name ||
      !template.html ||
      typeof template.isPaid !== "boolean"
    ) {
      throw new Error("Invalid template data.");
    }
		const createdTemplate = await prisma.template.create({
			data: {
				name: template.name,
				html: template.html,
				isPaid: template.isPaid,
				thumbnail: template.thumbnail,
			},
		});
		if (createdTemplate) {
			return {
				status: "success",
				message: "Created template successfully",
			};
		}
	} catch (error) {
		return {
			status: "error",
			message: "Error creating template",
		};
	}
};
export const getAllTemplates = async () => {
	try {
		const templates = await prisma.template.findMany();
		return templates;
	} catch (error) {
		return {
			status: "error",
			message: "Template could not be fetched",
		};
	}
};
export const deleteTemplateById = async (id: string) => {
	const session = await auth();
	// @ts-ignore
	// Check if user is authenticated
  if (!session || session.user.role !== "admin") {
    return { status: "error", message: "Unauthorized action." };
  }
	try {
		const deletedTemplate = await prisma.template.delete({
			where: {
				id,
			},
		});
		if (deletedTemplate) {
			revalidatePath("/admin/templates");
			return {
				status: "success",
				message: "Template deleted successfully",
			};
		}
	} catch (error) {
		return {
			status: "error",
			message: "something went wrong",
		};
	}
};
export const createPaymentIntent = async () => {
	const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
	try {
		const paymentIntent: stripe.PaymentIntent =
			await stripe.paymentIntents.create({
				amount: 500,
				currency: "inr",
			});
		if (paymentIntent) {
			return {
				status: "success",
				data: paymentIntent.client_secret,
			};
		}
	} catch (error) {
		return { status: "error", message: "Error creating payment intent" };
	}
};
export const getUniqueUser = async () => {
	const session = await auth();
	// Check if user is authenticated
	if (!session) return null;
	try {
		const user = await prisma.user.findUnique({
			where: {
				email: session?.user?.email!,
			},
		});
		if (user) {
			return user;
		}
	} catch (error) {
		console.log(error);
	}
};
export const saveSubscription = async ({
	userId,
	amount,
	paymentId,
}: {
	userId: string;
	amount: string;
	paymentId: string;
	}) => {
	// Check if userId, amount, and paymentId are provided
	if (!userId || !amount || !paymentId) {
    return { status: "error", message: "Invalid subscription data." };
  }
	try {
		const newSubscription = await prisma.subscription.create({
			data: {
				userId,
				amount,
				paymentId,
			},
		});
		const updateUser = await prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				subscription: newSubscription,
			},
		});
		if (newSubscription && updateUser) {
			revalidatePath("/profile");
			return {
				status: "success",
				message: "Subscription created successfully",
				data: updateUser,
			};
		}
	} catch (error) {
		return {
			status: "error",
			message: "Error creating subscription",
		};
	}
};
