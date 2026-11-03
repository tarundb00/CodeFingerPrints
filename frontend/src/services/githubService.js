// frontend/src/services/githubService.js

import axios from 'axios';

const API_BASE = '/api/teacher/github';

export const githubService = {
   checkRepositoryAvailability: async (organization, repoName) => {
    try {
      const response = await axios.get(`${API_BASE}/check-availability`, {
        params: { organization, repoName }
      });
      return response.data;
    } catch (error) {
      console.error('Error checking repository availability:', error);
      throw error;
    }
  },

   validateUsernames: async (usernames) => {
    try {
      const response = await axios.post(`${API_BASE}/validate-usernames`, usernames);
      return response.data;
    } catch (error) {
      console.error('Error validating usernames:', error);
      throw error;
    }
  },

   createRepository: async (repoData) => {
    try {
      const response = await axios.post(`${API_BASE}/create`, repoData);
      return response.data;
    } catch (error) {
      console.error('Error creating repository:', error);
      throw error;
    }
  },

   addCollaborator: async (organization, repoName, username, permission) => {
    try {
      const response = await axios.post(`${API_BASE}/add-collaborator`, null, {
        params: { organization, repoName, username, permission }
      });
      return response.data;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      throw error;
    }
  },

   configureWebhook: async (organization, repoName, webhookUrl) => {
    try {
      const response = await axios.post(`${API_BASE}/configure-webhook`, null, {
        params: { organization, repoName, webhookUrl }
      });
      return response.data;
    } catch (error) {
      console.error('Error configuring webhook:', error);
      throw error;
    }
  },

   configureBranchProtection: async (organization, repoName, rules) => {
    try {
      const response = await axios.post(`${API_BASE}/configure-protection`, rules, {
        params: { organization, repoName }
      });
      return response.data;
    } catch (error) {
      console.error('Error configuring branch protection:', error);
      throw error;
    }
  }
};