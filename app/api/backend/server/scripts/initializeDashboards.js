// scripts/initializeDashboards.js
const mongoose = require('mongoose');
const AdminDashboard = require('../models/AdminDashboard');
const EmployerDashboard = require('../models/EmployerDashboard');
const WriterDashboard = require('../models/WriterDashboard');
const EditorDashboard = require('../models/EditorDashboard');

const initializeDashboards = async () => {
  try {
    console.log('Initializing dashboard collections...');

    // Initialize Admin Dashboard if it doesn't exist
    const adminDashboardExists = await AdminDashboard.findOne({});
    if (!adminDashboardExists) {
      await AdminDashboard.create({
        totalUsers: 0,
        activeUsers: 0,
        systemMetrics: {
          cpuUsage: 0,
          memoryUsage: 0,
          diskSpace: 0,
          lastUpdated: new Date()
        }
      });
      console.log('✅ Admin Dashboard initialized');
    }

    // Initialize default Employer Dashboard schema
    const employerDashboardExists = await EmployerDashboard.findOne({});
    if (!employerDashboardExists) {
      await EmployerDashboard.create({
        companyId: null, // This will be updated when employers are created
        metrics: {
          totalApplications: 0,
          activeWriters: 0,
          completedProjects: 0,
          averageRating: 0
        }
      });
      console.log('✅ Employer Dashboard initialized');
    }

    // Initialize default Writer Dashboard schema
    const writerDashboardExists = await WriterDashboard.findOne({});
    if (!writerDashboardExists) {
      await WriterDashboard.create({
        writerId: null, // This will be updated when writers are created
        statistics: {
          completedProjects: 0,
          averageRating: 0,
          totalEarnings: 0,
          wordsWritten: 0
        }
      });
      console.log('✅ Writer Dashboard initialized');
    }

    // Initialize default Editor Dashboard schema
    const editorDashboardExists = await EditorDashboard.findOne({});
    if (!editorDashboardExists) {
      await EditorDashboard.create({
        editorId: null, // This will be updated when editors are created
        performance: {
          projectsReviewed: 0,
          averageTurnaroundTime: 0,
          qualityScore: 0
        },
        workload: {
          currentProjects: 0,
          maxCapacity: 10
        }
      });
      console.log('✅ Editor Dashboard initialized');
    }

    console.log('✅ All dashboard collections initialized successfully');
  } catch (error) {
    console.error('Error initializing dashboards:', error);
    throw error;
  }
};

module.exports = initializeDashboards;