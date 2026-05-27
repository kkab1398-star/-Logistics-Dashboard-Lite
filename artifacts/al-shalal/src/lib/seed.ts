import { createDriver, createExpense, listDrivers } from "@workspace/api-client-react";
import { CreateExpenseBodyType } from "@workspace/api-client-react";

export async function seedData() {
  try {
    const existing = await listDrivers();
    if (existing && existing.length > 0) {
      console.log("Data already seeded");
      return; // Already seeded
    }

    const driver1 = await createDriver({
      name: "Ahmed Al-Farsi",
      phone: "+966 50 123 4567",
      vehicleNumber: "KSA-1234",
      username: "ahmed",
      password: "driver123",
    });

    const driver2 = await createDriver({
      name: "Muhammad Tariq",
      phone: "+92 300 123 4567",
      vehicleNumber: "KSA-9876",
      username: "tariq",
      password: "driver123",
    });

    await createExpense({
      driverId: driver1.id,
      type: CreateExpenseBodyType.diesel,
      amount: 44.75,
      liters: 25,
      date: new Date().toISOString(),
      notes: "Route to Riyadh",
    });

    await createExpense({
      driverId: driver1.id,
      type: CreateExpenseBodyType.maintenance,
      amount: 500,
      date: new Date(Date.now() - 86400000).toISOString(),
      notes: "Tire replacement",
    });

    await createExpense({
      driverId: driver2.id,
      type: CreateExpenseBodyType.oil,
      amount: 150,
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      notes: "Engine oil change",
    });

    console.log("Data seeded successfully");
  } catch (error) {
    console.error("Failed to seed data:", error);
  }
}