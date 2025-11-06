import mysql.connector
from datetime import datetime

# ==============================================================================
# 1. Configuration & Setup (XAMPP/Local MySQL)
# ==============================================================================

# IMPORTANT: Set this to match your XAMPP setup
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',  # Default XAMPP password is blank
    'database': 'freelancer_timer_db' # New database name for this app
}

# ==============================================================================
# 2. Database Schema (Adapted for Time Tracking)
# ==============================================================================

SQL_SETUP = """
DROP TABLE IF EXISTS TimeLog;
DROP TABLE IF EXISTS Project;
DROP TABLE IF EXISTS Client;
DROP TABLE IF EXISTS Freelancer;
CREATE TABLE Freelancer (
    FreelancerID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL
);
CREATE TABLE Client (
    ClientID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL
);
CREATE TABLE Project (
    ProjectID INT AUTO_INCREMENT PRIMARY KEY,
    FreelancerID INT,
    ClientID INT NOT NULL,
    Name VARCHAR(255) NOT NULL,
    RateType ENUM('Hourly', 'Fixed') NOT NULL,
    RateValue DECIMAL(10, 2) NOT NULL,
    Status VARCHAR(50) DEFAULT 'Active',
    FOREIGN KEY (FreelancerID) REFERENCES Freelancer(FreelancerID),
    FOREIGN KEY (ClientID) REFERENCES Client(ClientID)
);
CREATE TABLE TimeLog (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    ProjectID INT NOT NULL,
    StartTime DATETIME NOT NULL,
    EndTime DATETIME NULL,
    FOREIGN KEY (ProjectID) REFERENCES Project(ProjectID) ON DELETE CASCADE
);
-- Insert a placeholder freelancer and client
INSERT INTO Freelancer (Name, email) VALUES ('Time Tracker User', 'user@tracker.com');
INSERT INTO Client (Name) VALUES ('Initial Test Client');
"""

# ==============================================================================
# 3. Database Connection Helper Functions
# ==============================================================================

def get_db_connection():
    """Establishes and returns a MySQL database connection."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as err:
        print(f"Database Connection Error: {err}")
        return None

def execute_query(query, params=None, fetch=False, commit=False):
    """Executes a database query and handles connection lifecycle."""
    conn = get_db_connection()
    if not conn:
        return [] if fetch else None

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params or ())
        if commit:
            conn.commit()
            return cursor.lastrowid if 'INSERT INTO' in query.upper() else True
        if fetch:
            return cursor.fetchall()
        return True
    except mysql.connector.Error as err:
        print(f"Query Error: {err}")
        return [] if fetch else None
    finally:
        cursor.close()
        conn.close()
