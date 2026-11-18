import { useEffect, useState } from 'react';
import axios from 'axios';
import { UserContext } from "./UserContext.js";

export function UserContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      axios.get('/api/profile').then(({ data }) => {
        if (data) {
          setUser({ ...data, id: data.id || data._id, _id: data._id || data.id });
        } else {
          setUser(null);
        }
      }).catch(err => {
        // This catch block handles the 401 error gracefully
        // when a user is not logged in.
        console.log("Not logged in or session expired.");
      }).finally(() => {
        setReady(true);
      });
    } else {
      setReady(true);
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, ready }}>
      {children}
    </UserContext.Provider>
  );
}
