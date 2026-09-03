# Security Specification: Government School Order Management & Agent Portal

## 1. Data Invariants
1. **Agent Data Isolation**: An agent with `role == 'AGENT'` MUST ONLY be allowed to read orders where `order.agentId == agent.agentId` (or mapped agentId). Under no circumstances may Agent A read Agent B's orders or company-wide orders.
2. **Document Visibility**: Documents with `visibleToAgent == false` are confidential internal company documents and MUST NEVER be accessible to Agents.
3. **Audit Log Immutability**: Activity logs and order status history entries are append-only. They can never be modified or deleted by non-super-admins.
4. **RBAC Integrity**: Users cannot assign or escalate their own roles or privileges (`role`, `agentId`, `isActive`).
5. **Payment Validation**: Payments can only be recorded or updated by Accounts and Super Admin roles.
6. **Dispatch Validation**: Dispatch tracking information (courier, tracking number, LR/AWB) can be modified by Dispatch, Operations, and Admin roles.

## 2. Dirty Dozen Threat Payloads Tested
1. **Payload 1 (Agent Bypassing Filter to Read Competitor's Orders)**: Agent A querying `/orders` where `agentId == 'AGT-0002'` -> Must return `PERMISSION_DENIED`.
2. **Payload 2 (Privilege Escalation on User Doc)**: Agent updating their own document with `{ role: 'SUPER_ADMIN' }` -> Must return `PERMISSION_DENIED`.
3. **Payload 3 (Viewing Hidden Internal Document)**: Agent requesting `/documents/doc-internal-quote` where `visibleToAgent == false` -> Must return `PERMISSION_DENIED`.
4. **Payload 4 (Tampering with Audit Logs)**: Dispatch user updating `/activityLogs/log1` -> Must return `PERMISSION_DENIED`.
5. **Payload 5 (Deleting Closed Order)**: Agent sending `DELETE` to `/orders/ORD-2026-00001` -> Must return `PERMISSION_DENIED`.
6. **Payload 6 (Unauthenticated Public Reading)**: Unauthenticated visitor accessing `/orders` or `/users` -> Must return `PERMISSION_DENIED`.
7. **Payload 7 (Overwriting Invoice Number as Dispatch Role)**: Dispatch staff modifying invoice amounts -> Must be restricted.
8. **Payload 8 (Injecting Negative Order Value)**: Creating an order with `orderValue: -50000` -> Must be rejected by validation rules.
9. **Payload 9 (Agent Creating an Order Directly)**: Agent attempting `create` on `/orders` -> Must return `PERMISSION_DENIED`.
10. **Payload 10 (Direct Modification of Agent Directory)**: Agent modifying commission notes on `/agents/AGT-0001` -> Must return `PERMISSION_DENIED`.
11. **Payload 11 (Accessing Other User's Notifications)**: Agent A querying `/notifications` with `userId == 'User_B'` -> Must return `PERMISSION_DENIED`.
12. **Payload 12 (Deactivating Admin User by Non-Admin)**: Operations user deactivating Super Admin -> Must return `PERMISSION_DENIED`.
