# 🎫 Helpdesk Ticket Management System

A simple Helpdesk Ticket Management System** **

The main goal of this project is to make sure that the **most pressing ticket is always shown on top**. The system also handles overdue tickets, ticket assignment, customer search, filters, pagination, and automatic priority escalation.

---

## 📌 Problem Statement

The helpdesk receives many different types of tickets. Some tickets are urgent and need a quick response, while others are normal requests.

The main requirement is to maintain a queue where the **right ticket always comes on top** based on its priority and response time.

Tickets that have crossed their agreed response time should be treated as overdue and should get attention first.

The system should also make it easy to:

* Check overdue tickets
* See tickets assigned to a particular user
* Search tickets using customer name
* Manage a large number of tickets using pagination

### Twist

The system also includes an automatic escalation feature.

If a ticket crosses its agreed response time, its priority is increased by **one level per run**:

**Normal → High → Urgent**

An already Urgent ticket cannot be increased further.

---

## 🚀 Features

### 1. Ticket Management

Users can manage helpdesk tickets with information such as:

* Customer name
* Issue
* Priority
* Response time
* Status
* Assignee
* Ticket details

### 2. Priority Levels

The system supports three priority levels:

* 🟢 Normal
* 🟠 High
* 🔴 Urgent

Priority is used while deciding the order of tickets in the queue.

### 3. Smart Ticket Queue

The ticket queue automatically keeps the most important tickets at the top.

Overdue tickets are given higher attention and are moved towards the front of the queue.

### 4. Overdue Ticket Detection

The system checks the agreed response time of tickets.

If the response deadline has passed, the ticket is marked as **Overdue**.

### 5. Overdue Filter

A separate filter is provided to quickly see only the tickets that are overdue.

### 6. Ticket Assignment

Tickets can be assigned to helpdesk team members.

The current assignee can be viewed from the ticket information.

### 7. Assigned to Me

Users can filter the queue and view only the tickets assigned to them.

### 8. Customer Search

Tickets can be searched using the **customer name**.

This makes it easier to find all tickets related to a particular customer.

### 9. Pagination

The system supports pagination so that a large number of tickets can be displayed in smaller pages.

Pagination also works with the available filters and search functionality.

### 10. Automatic Priority Escalation

The system automatically checks overdue tickets and increases their priority by one level.

The escalation works like:

```text
Normal → High → Urgent
```

For example:

```text
Normal + Overdue → High
High + Overdue → Urgent
Urgent + Overdue → Urgent
```

A ticket cannot jump directly from **Normal to Urgent** in a single run.

---

## 🔄 How the Queue Works

The queue is the main part of the application.

Whenever tickets are displayed, the system checks their priority and overdue status to decide their order.

The basic idea is:

```text
Overdue / most pressing tickets
            ↓
        Urgent
            ↓
          High
            ↓
         Normal
```

The exact ordering is handled by the application's queue logic so that the most pressing ticket is available first.

---

## ⏰ Automatic Escalation

The escalation process checks the tickets automatically.

For every ticket:

1. Check whether its response time has been crossed.
2. If it is overdue, check its current priority.
3. Increase the priority by one level.
4. Do not increase Urgent tickets further.
5. Update the queue after escalation.

### Example

Before escalation:

```text
Ticket A → Normal → Overdue
Ticket B → High → Overdue
Ticket C → Urgent → Overdue
```

After one escalation run:

```text
Ticket A → High
Ticket B → Urgent
Ticket C → Urgent
```

If the process runs again and the tickets are still overdue:

```text
Ticket A → Urgent
Ticket B → Urgent
Ticket C → Urgent
```

This makes sure that **only one priority level is increased in each run**.

---

## 🖥️ Main Dashboard

The dashboard provides an easy way to manage the helpdesk queue.

It allows the user to:

* View tickets
* Check priority
* Identify overdue tickets
* Assign tickets
* Search customers
* Apply filters
* Navigate through pages
* Manage ticket status

---

## 🛠️ Technologies Used

* HTML
* CSS
* JavaScript
* Git & GitHub

> Update this section if your project uses any additional framework, library, database, or backend technology.

---

## 📂 Project Structure

```text
Helpdesk-Ticket-Management/
│
├── index.html
├── style.css
├── script.js
├── README.md
│
└── assets/
    └── ...
```

> The exact file structure may vary depending on the implementation.

---

## ▶️ How to Run the Project

### Step 1: Clone the repository

```bash
git clone <repository-url>
```

### Step 2: Open the project

Go to the project folder:

```bash
cd <project-folder>
```

### Step 3: Run the application

Open `index.html` in a browser.

If using VS Code, the project can also be opened using **Live Server**.

---

## 🧪 Testing

The following cases should be checked:

### Normal Ticket

```text
Priority: Normal
Status: Within response time
Expected: Normal position in queue
```

### Overdue Normal Ticket

```text
Priority: Normal
Status: Overdue
Expected: Moves towards the front and escalates to High
```

### Overdue High Ticket

```text
Priority: High
Status: Overdue
Expected: Escalates to Urgent
```

### Overdue Urgent Ticket

```text
Priority: Urgent
Status: Overdue
Expected: Remains Urgent
```

### Search

Search using a customer name and verify that the related tickets are displayed.

### Assignment

Assign a ticket to a user and verify that it appears in the **Assigned to Me** filter.

### Pagination

Add/view multiple tickets and verify that page navigation works correctly.

---

## 🎯 Main Objective

The main objective of this project is to create a helpdesk system where:

> **The right ticket is always on top.**

The project focuses mainly on correct queue ordering and then adds useful features such as filtering, assignment, customer search, pagination, and automatic escalation.

---

## 🔮 Future Improvements

Some features that can be added in the future:

* Login and authentication
* Multiple helpdesk teams
* Email notifications
* Real-time ticket updates
* Database integration
* Ticket activity/history
* Advanced analytics and reports
* Role-based access
* Notification when a ticket becomes overdue

---

## 👩‍💻 Project

**Helpdesk Ticket Management System**
