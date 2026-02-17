CREATE DATABASE IF NOT EXISTS cluster
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cluster;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullname VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('coach', 'employee', 'admin') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clusters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  coach_id INT NOT NULL,
  status ENUM('pending', 'active', 'rejected') NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clusters_coach
  FOREIGN KEY (coach_id) REFERENCES users(id)
  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cluster_members (
  cluster_id INT NOT NULL,
  employee_id INT NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cluster_id, employee_id),
  CONSTRAINT fk_cluster_members_cluster
    FOREIGN KEY (cluster_id) REFERENCES clusters(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cluster_members_employee
    FOREIGN KEY (employee_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cluster_id INT NOT NULL,
  employee_id INT NOT NULL,
  schedule TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_schedules_cluster
    FOREIGN KEY (cluster_id) REFERENCES clusters(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_schedules_employee
    FOREIGN KEY (employee_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cluster_id INT NOT NULL,
  employee_id INT NOT NULL,
  time_in_at DATETIME NULL,
  time_out_at DATETIME NULL,
  tag ENUM('On Time', 'Late', 'Break Time', 'Lunch Time') DEFAULT NULL,
  note TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_attendance_cluster_employee (cluster_id, employee_id),
  CONSTRAINT fk_attendance_cluster
    FOREIGN KEY (cluster_id) REFERENCES clusters(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_attendance_employee
    FOREIGN KEY (employee_id) REFERENCES users(id)
    ON DELETE CASCADE
);