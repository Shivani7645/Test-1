## 🧠 Thought Process Behind the Solution

The main thing we focused on while building this project was the **ticket queue**.

We first understood that the helpdesk can have a large number of tickets, so simply showing tickets in the order they were created would not be useful. A ticket that is urgent or already overdue should get attention before a normal ticket.

So, we decided to make the **queue ordering the main logic** of the project.

### 1. First, we created the ticket system

We created tickets with the important details like customer name, issue, priority, response time, status and assignee.

This gives us all the information needed to decide which ticket should come first.

### 2. Then we worked on the queue

After creating the tickets, we focused on arranging them properly.

The queue checks the ticket's priority and whether the ticket is overdue. The most pressing tickets are placed towards the top so that the helpdesk member knows what needs attention first.

### 3. We added overdue checking

Every ticket has an agreed response time. We compare this time with the current time.

If the response deadline has passed, the ticket is considered overdue.

Overdue tickets are given higher importance in the queue.

### 4. Then we added filters and search

Once the main queue was working, we added features that make the large ticket list easier to manage.

We added:

* Overdue filter
* Assigned to Me filter
* Customer name search
* Pagination

These features help the user quickly find the required tickets without changing the main queue logic.

### 5. Automatic escalation

The twist in the problem statement required automatic escalation.

So, we added a check that looks for tickets whose response time has been crossed.

If a ticket is overdue, its priority is increased by only one level:

```text
Normal → High → Urgent
```

We specifically made sure that a ticket does **not** jump from Normal directly to Urgent in one run.

### 6. Queue is updated after escalation

After the priority of a ticket changes, the queue is updated again.

This is important because changing a ticket's priority can also change its position in the queue.

### 7. Final approach

So our overall approach was:

```text
Create Tickets
      ↓
Check Priority & Response Time
      ↓
Find Overdue Tickets
      ↓
Arrange the Queue
      ↓
Apply Filters / Search / Pagination
      ↓
Automatically Escalate Overdue Tickets
      ↓
Update Queue Again
```

The main idea throughout the project was to keep the queue logic as the core part and then build the other features around it.

