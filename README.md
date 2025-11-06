💼 ProManager Freelancer Time Tracker

This is a single-file web application built with Python (Flask) and MySQL (via XAMPP) designed for freelancers to track time, manage projects, and calculate earnings based on hourly or fixed rates.

The front-end logic utilizes modern JavaScript and Tailwind CSS, while the back-end handles persistent storage, time calculation, and database operations.

🛠️ Prerequisites

Before starting the application, you must have the following software installed and running:

Python 3.x: (Ensure it's in your system PATH)

XAMPP (or equivalent local MySQL server): MySQL service must be running.

⚙️ Setup and Installation

1. Install Dependencies

Open your terminal or command prompt in the project directory and install the necessary Python libraries:

pip install Flask mysql-connector-python


2. Configure MySQL Database (XAMPP)

The application is configured to connect to a database named freelancer_timer_db.

Start Services: Ensure the Apache and MySQL modules are running in your XAMPP Control Panel.

Access phpMyAdmin: Open your web browser and go to http://localhost/phpmyadmin.

Create Database:

Click on the "Databases" tab or the "New" link.

In the "Database name" field, enter: freelancer_timer_db

Click "Create".

3. Verify Database Credentials

Open the project_timer_app.py file and verify the DB_CONFIG matches your local MySQL setup.

The default configuration for XAMPP is:

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',  # Standard XAMPP password is blank
    'database': 'freelancer_timer_db'
}


If you have set a password for your MySQL root user in XAMPP, update the 'password' field accordingly.

▶️ How to Run the Application

1. Start the Flask Server

Open your terminal, navigate to the directory containing project_timer_app.py, and execute:

python project_timer_app.py


The application will start, typically running on http://127.0.0.1:5000/.

2. Initialize the Tables

Before using the app, you must create the necessary tables (Project, TimeLog, Client, etc.) in the database you created in Step 2.

Open your browser and navigate to:

[http://127.0.0.1:5000/setup_db](http://127.0.0.1:5000/setup_db)


Wait for the success message: "Database schema created successfully!"

3. Access the Tracker

Once the setup is complete, navigate to the main application dashboard:

[http://127.0.0.1:5000/](http://127.0.0.1:5000/)


You can now use the New Project button to add projects, set rates, and start tracking your work time.
