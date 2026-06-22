# Pag-IBIG Fund Member Database System

A simple administrative dashboard portal designed to manage Pag-IBIG member records, including personal information, contact details, employment history, government IDs, and beneficiary records.

## 🛠️ Prerequisites

Before running this project locally, make sure you have the following installed:

1. **Node.js** (includes npm)
2. **MySQL Server**
3. **Git**

---

# 💻 Installation and Setup

## 1. Clone the Repository

Clone the repository using your terminal:

```bash
git clone https://github.com/Juliana-Eunice/Pag-ibig_DatabaseProject.git
cd Pag-ibig_DatabaseProject
```

---

## 2. Configure the MySQL Database

Open **MySQL Workbench** or your preferred MySQL client and create the database:

```sql
CREATE DATABASE im_project;
```

Make sure the required tables are created according to the database schema:

* `Member`
* `Contact`
* `Employment`
* `PrevEmployment`
* `Heir`
* `GovernmentID`
* `Employer`

**Note:** It's better to import our CSVs directly to have the exact same attributes, data types, and sample data.

---

## 3. Configure Environment Variables

Create a file named `.env` in the root directory of the project.

Add your MySQL database credentials:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=im_project
```

Replace `YOUR_MYSQL_PASSWORD` with your actual MySQL password.

---

## 4. Install Dependencies

Install all required Node.js packages:

```bash
npm install
```

---

## 5. Start the Backend Server

Run the server using:

```bash
node server.js
```

If successful, the terminal should display:

```
🚀 Administrative server tracking on port 3000.
```

The backend is now connected to the MySQL database.

---

## 6. Open the System Portal

Open the `login.html` file in your browser.

You may also use **Live Server** in Visual Studio Code:

1. Right-click `login.html`
2. Select **Open with Live Server**

The admin portal will now be accessible.

---

# 🔐 Admin Login Credentials

Use the following default testing credentials:

**Username**
```
admin
```

**Password**
```
grp3db.IM
```

---

# ⚙️ Technologies Used

* HTML
* CSS
* JavaScript
* Node.js
* MySQL Workbench

---

# 📌 Notes

* Ensure MySQL is running before starting the server.
* Keep your `.env` file private and do not upload it to GitHub.
* Database tables must exist before running the application.
