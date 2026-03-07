import axios from 'axios';

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

const buildConfig = (token) => ({
  headers: token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {},
});

const normalizeError = (error) => {
  const fallbackMessage = 'Something went sideways while talking to the API.';
  const message = error?.response?.data?.message || error?.message || fallbackMessage;

  return new Error(message);
};

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
});

export const getGroups = async (token) => {
  try {
    const response = await apiClient.get('/api/groups', buildConfig(token));
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const createGroup = async (payload, token) => {
  try {
    const response = await apiClient.post('/api/groups', payload, buildConfig(token));
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const joinGroup = async (payload, token) => {
  try {
    const response = await apiClient.post('/api/groups/join', payload, buildConfig(token));
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const getGroupById = async (groupId, token) => {
  try {
    const response = await apiClient.get(`/api/groups/${groupId}`, buildConfig(token));
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const getGroupExpenses = async (groupId, token) => {
  try {
    const response = await apiClient.get(`/api/groups/${groupId}/expenses`, buildConfig(token));
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw normalizeError(error);
  }
};

export const getGroupBalances = async (groupId, token) => {
  try {
    const response = await apiClient.get(`/api/groups/${groupId}/balances`, buildConfig(token));
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw normalizeError(error);
  }
};

export const updateWalletAddress = async (userId, walletAddress, token) => {
  try {
    const response = await apiClient.patch(
      `/api/users/${userId}/wallet`,
      { walletAddress },
      buildConfig(token),
    );
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const syncUser = async (payload, token) => {
  try {
    const response = await apiClient.post('/api/users/sync', payload, buildConfig(token));
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const createExpense = async (payload, token) => {
  try {
    const response = await apiClient.post('/api/expenses', payload, buildConfig(token));
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const createSettlement = async (payload, token) => {
  try {
    const response = await apiClient.post('/api/settlements', payload, buildConfig(token));
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const deleteGroup = async (groupId, requestingUserId, token) => {
  try {
    await apiClient.delete(
      `/api/groups/${groupId}`,
      { ...buildConfig(token), params: { requestingUserId } },
    );
  } catch (error) {
    throw normalizeError(error);
  }
};

export const removeMember = async (groupId, userId, requestingUserId, token) => {
  try {
    await apiClient.delete(
      `/api/groups/${groupId}/members/${userId}`,
      { ...buildConfig(token), params: { requestingUserId } },
    );
  } catch (error) {
    throw normalizeError(error);
  }
};

export const sendReminder = async (payload, token) => {
  try {
    const response = await apiClient.post('/api/reminders/send', payload, buildConfig(token));
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const fetchReminders = async (userId, token) => {
  try {
    const response = await apiClient.get(`/api/reminders/inbox/${userId}`, buildConfig(token));
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
};

export const markReminderRead = async (reminderId, token) => {
  try {
    await apiClient.patch(`/api/reminders/${reminderId}/read`, {}, buildConfig(token));
  } catch {
    // silently fail — not critical
  }
};

export const uploadBill = async (imageFile, groupId) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (groupId != null) formData.append('groupId', String(groupId));
    const response = await apiClient.post('/api/expenses/upload-bill', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};
