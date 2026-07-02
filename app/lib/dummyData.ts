export type TransactionLog = {
    id: string;
    transactionId: string;
    action: string;
    oldValuesJson: string;
    newValuesJson: string;
    reason: string;
    changedByCashierId: string;
    createdAtUtc: string;
  };
  
  export const dummyTransactionLogs: TransactionLog[] = [
    {
      id: "log-001",
      transactionId: "4b733f7f-8fc2-4755-b9c9-13c71acead7d",
      action: "CREATE_TRANSACTION",
      oldValuesJson: "",
      newValuesJson: JSON.stringify(
        {
          direction: "incoming",
          amount: 100,
          category: "Deposit(s)",
        },
        null,
        2
      ),
      reason: "Initial deposit",
      changedByCashierId: "b7fbaf88-43dd-411c-8ca7-f5e2cfa38c3e",
      createdAtUtc: "2026-06-29T02:55:27.553Z",
    },
    {
      id: "log-002",
      transactionId: "4b733f7f-8fc2-4755-b9c9-13c71acead7d",
      action: "UPDATE_TRANSACTION",
      oldValuesJson: JSON.stringify(
        {
          amount: 100,
        },
        null,
        2
      ),
      newValuesJson: JSON.stringify(
        {
          amount: 125,
        },
        null,
        2
      ),
      reason: "Customer corrected deposit amount",
      changedByCashierId: "e82041e1-58c7-4eb5-89cb-09fb3070a805",
      createdAtUtc: "2026-06-29T03:02:44.000Z",
    },
    {
      id: "log-003",
      transactionId: "62a8dc49-967d-4d70-91a3-0c09d649cd7f",
      action: "CREATE_TRANSACTION",
      oldValuesJson: "",
      newValuesJson: JSON.stringify(
        {
          direction: "incoming",
          amount: 200,
          category: "Deposit(s)",
        },
        null,
        2
      ),
      reason: "Initial deposit",
      changedByCashierId: "b7fbaf88-43dd-411c-8ca7-f5e2cfa38c3e",
      createdAtUtc: "2026-06-29T02:56:10.071Z",
    },
    {
      id: "log-004",
      transactionId: "62a8dc49-967d-4d70-91a3-0c09d649cd7f",
      action: "COMPLIANCE_CHECK",
      oldValuesJson: JSON.stringify(
        {
          status: "Pending",
        },
        null,
        2
      ),
      newValuesJson: JSON.stringify(
        {
          status: "Reviewed",
        },
        null,
        2
      ),
      reason: "Transaction checked against daily threshold rules",
      changedByCashierId: "8d663ff4-4713-4cb7-92ff-0f90a2522aa3",
      createdAtUtc: "2026-06-29T03:04:10.000Z",
    },
  ];