from flask import Flask, request, jsonify, render_template
from datetime import datetime
import mysql.connector

from database import execute_query, get_db_connection, SQL_SETUP
from utils import calculate_total_due, calculate_total_time, format_time

app = Flask(__name__)
# Simplified: assume a single freelancer user
FREELANCER_ID = 1

# ==============================================================================
# 5. Flask Routes (API Endpoints & Main View)
# ==============================================================================

@app.route('/')
def dashboard():
    """Renders the main application view."""
    clients = execute_query("SELECT ClientID as id, Name FROM Client", fetch=True)

    # Render the main HTML template
    return render_template('index.html', clients=clients)

@app.route('/setup_db')
def setup_db():
    """Initializes and sets up the database schema."""
    conn = get_db_connection()
    if not conn:
        return "<h1 style='color:red;'>Database Connection Error. Check DB_CONFIG.</h1>"

    try:
        cursor = conn.cursor()
        for statement in SQL_SETUP.split(';'):
            if statement.strip():
                cursor.execute(statement)
        conn.commit()
        return "<h1>Database schema created successfully!</h1><p>Ready to use the application.</p><a href='/' style='background: #4F46E5; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none;'>Go to App</a>"
    except mysql.connector.Error as err:
        conn.rollback()
        return f"<h1>DB Setup Error</h1><p>Error: {err}</p>"
    finally:
        cursor.close()
        conn.close()

# --- API Endpoints ---

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """Fetches all projects and adds calculated data (time, due, running status)."""
    projects = execute_query(
        """
        SELECT p.ProjectID, p.Name, p.RateType, p.RateValue, p.Status, c.Name AS ClientName
        FROM Project p
        JOIN Client c ON p.ClientID = c.ClientID
        WHERE p.FreelancerID = %s
        ORDER BY p.ProjectID DESC
        """,
        (FREELANCER_ID,),
        fetch=True
    )

    if projects is None:
        return jsonify({"error": "Failed to fetch projects"}), 500

    now = datetime.now()

    for p in projects:
        # Fetch time logs
        logs = execute_query(
            "SELECT StartTime, EndTime FROM TimeLog WHERE ProjectID = %s ORDER BY StartTime ASC",
            (p['ProjectID'],),
            fetch=True
        )

        # Determine if timer is running
        is_running = False
        if logs and p['RateType'] == 'Hourly':
            # Check the last log entry
            last_log = logs[-1]
            if last_log['EndTime'] is None:
                is_running = True

        p['isTimerRunning'] = is_running

        # Calculate derived metrics
        total_time_ms = calculate_total_time(p['ProjectID'])
        p['TotalTimeLogged'] = format_time(total_time_ms)
        p['TotalDue'] = f"₹{calculate_total_due(p):.2f}"

        # Clean up database types for JSON
        p['RateValue'] = float(p['RateValue'])
        p['ProjectID'] = p['ProjectID']
    return jsonify(projects)

@app.route('/api/projects', methods=['POST'])
def save_project():
    """Creates a new project or updates an existing one."""
    data = request.json

    # 1. Input Validation
    if not all(k in data for k in ['name', 'client_name', 'rateType', 'rateValue']):
        return jsonify({"error": "Missing project fields"}), 400

    project_id = data.get('id')
    name = data['name']
    client_name = data['client_name']
    rate_type = data['rateType']
    rate_value = data['rateValue']

    # Check if client exists, if not create it
    client = execute_query("SELECT ClientID FROM Client WHERE Name = %s", (client_name,), fetch=True)
    if client:
        client_id = client[0]['ClientID']
    else:
        client_id = execute_query("INSERT INTO Client (Name) VALUES (%s)", (client_name,), commit=True)

    if project_id:
        # Update existing project
        query = "UPDATE Project SET Name = %s, ClientID = %s, RateType = %s, RateValue = %s WHERE ProjectID = %s AND FreelancerID = %s"
        success = execute_query(query, (name, client_id, rate_type, rate_value, project_id, FREELANCER_ID), commit=True)
        if success:
            return jsonify({"message": "Project updated successfully!"})
        else:
            return jsonify({"error": "Failed to update project."}), 500
    else:
        # Create new project
        query = "INSERT INTO Project (FreelancerID, ClientID, Name, RateType, RateValue, Status) VALUES (%s, %s, %s, %s, %s, 'Active')"
        project_id = execute_query(query, (FREELANCER_ID, client_id, name, rate_type, rate_value), commit=True)
        if project_id:
            return jsonify({"message": "Project added successfully!"}), 201
        else:
            return jsonify({"error": "Failed to create project."}), 500

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Deletes a project and its associated time logs (due to CASCADE)."""
    # Deleting the project will automatically delete TimeLogs due to ON DELETE CASCADE
    query = "DELETE FROM Project WHERE ProjectID = %s AND FreelancerID = %s"
    success = execute_query(query, (project_id, FREELANCER_ID), commit=True)

    if success:
        return jsonify({"message": "Project deleted successfully!"})
    else:
        return jsonify({"error": "Failed to delete project or project not found."}), 404

@app.route('/api/projects/<int:project_id>/status', methods=['POST'])
def update_status(project_id):
    """Updates the status of a project."""
    data = request.json
    new_status = data.get('status')

    if new_status not in ['Active', 'Invoiced', 'Paid']:
        return jsonify({"error": "Invalid status value"}), 400

    query = "UPDATE Project SET Status = %s WHERE ProjectID = %s AND FreelancerID = %s"
    success = execute_query(query, (new_status, project_id, FREELANCER_ID), commit=True)

    if success:
        return jsonify({"message": f"Project status set to {new_status}"})
    else:
        return jsonify({"error": "Failed to update project status."}), 500

@app.route('/api/timer/<int:project_id>', methods=['POST'])
def toggle_timer(project_id):
    """Starts or stops the timer for an hourly project."""

    # 1. Check if the project is hourly and active
    project = execute_query(
        "SELECT RateType, Status FROM Project WHERE ProjectID = %s AND FreelancerID = %s",
        (project_id, FREELANCER_ID),
        fetch=True
    )
    if not project or project[0]['RateType'] != 'Hourly' or project[0]['Status'] != 'Active':
        return jsonify({"error": "Timer can only be toggled for Active Hourly projects."}), 400

    now = datetime.now()

    # 2. Check for a running timer
    running_log = execute_query(
        "SELECT LogID FROM TimeLog WHERE ProjectID = %s AND EndTime IS NULL ORDER BY StartTime DESC LIMIT 1",
        (project_id,), fetch=True
    )

    if running_log:
        # STOP the timer: Update EndTime
        log_id = running_log[0]['LogID']
        query = "UPDATE TimeLog SET EndTime = %s WHERE LogID = %s"
        execute_query(query, (now, log_id), commit=True)
        return jsonify({"message": "Timer stopped."})
    else:
        # START the timer: Insert a new log entry
        query = "INSERT INTO TimeLog (ProjectID, StartTime, EndTime) VALUES (%s, %s, NULL)"
        execute_query(query, (project_id, now), commit=True)
        return jsonify({"message": "Timer started!"})

if __name__ == '__main__':
    # You can change the host and port as needed. debug=True should only be used for development.
    # Set host to '0.0.0.0' to ensure accessibility
    app.run(debug=True, host='0.0.0.0', port=5000)
