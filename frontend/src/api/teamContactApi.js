import axiosInstance from "./axios";

const API_URL = "/team-contacts";

export const getTeamContacts = async () => {
  const res = await axiosInstance.get(API_URL);
  return res.data;
};

export const addTeamContact = async (contact) => {
  const res = await axiosInstance.post(API_URL, contact);
  return res.data;
};

export const deleteTeamContact = async (id) => {
  const res = await axiosInstance.delete(`${API_URL}/${id}`);
  return res.data;
};
