import React from "react";
import { useUsers } from "../hooks/useUsers";

export default function UserStatusTable() {
  const { allUsers, usersLoading, usersError } = useUsers();

  return (
    <div className="overflow-x-auto">
      <h3 className="text-xl font-bold mb-4 text-white">User Online Status</h3>
      {usersLoading ? (
        <div className="text-gray-400 px-4 py-2">Loading users...</div>
      ) : usersError ? (
        <div className="text-red-400 px-4 py-2">{usersError}</div>
      ) : allUsers.length === 0 ? (
        <div className="text-gray-400 px-4 py-2">No users found.</div>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-2 text-gray-400">Name</th>
              <th className="px-4 py-2 text-gray-400">Student ID</th>
              <th className="px-4 py-2 text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((user) => (
              <tr key={user.id} className="border-b border-white/5">
                <td className="px-4 py-2 text-white">{user.name}</td>
                <td className="px-4 py-2 text-gray-300">{user.studentId}</td>
                <td className="px-4 py-2">
                  {user.active ? (
                    <span className="inline-flex items-center gap-1 text-green-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span> Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span> Offline
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
