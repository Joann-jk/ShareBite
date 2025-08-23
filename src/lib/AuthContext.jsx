import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userDetail,setUserDetail] = useState(null)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getSessionAndRole() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) console.error("Error getting session:", error);
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq('id', currentUser.id)
          .single();
        setUserRole(data.role);
        setUserDetail(data)
      } else {
        setUserRole(null);
      }
      setLoading(false);
    }

    getSessionAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user || null;
      setUser(newUser);
      setLoading(false);

      if (newUser) {
        supabase
          .from("users")
          .select("role")
          .eq('id', newUser.id)
          .single()
          .then(({ data }) => setUserRole(data));
      } else {
        setUserRole(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole,userDetail, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);