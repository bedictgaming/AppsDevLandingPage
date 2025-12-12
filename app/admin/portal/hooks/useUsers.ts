import { useEffect, useState } from "react";
import axios from "axios";
import { pusherClient } from "@/lib/pusher";

export interface User {
  id: string;
  name: string;
  email?: string;
  studentId?: string;
  active: boolean;
}

export function useUsers() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const adminToken = localStorage.getItem("adminToken");
        if (!adminToken) {
          setUsersError("Not authenticated");
          setUsersLoading(false);
          return;
        }
        const response = await axios.get("http://localhost:5000/users", {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        setAllUsers(response.data.users || []);
      } catch (err: any) {
        setUsersError("Failed to fetch users");
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();

    // Subscribe to Pusher for real-time user status updates
    const channel = pusherClient.subscribe("users");
    const handler = (data: { userId: string; active: boolean }) => {
      setAllUsers((prevUsers) => {
        const found = prevUsers.some((user) => user.id === data.userId);
        if (found) {
          return prevUsers.map((user) =>
            user.id === data.userId ? { ...user, active: data.active } : user
          );
        } else {
          // Optionally, fetch users again if a new user logs in
          fetchUsers();
          return prevUsers;
        }
      });
    };
    channel.bind("user-status-changed", handler);

    return () => {
      channel.unbind("user-status-changed", handler);
      pusherClient.unsubscribe("users");
    };
  }, []);

  return { allUsers, usersLoading, usersError };
}
