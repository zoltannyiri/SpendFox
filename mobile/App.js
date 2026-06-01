import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from './supabase';
import { useEffect, useState } from 'react';

export default function App() {
  const [data, setData] = useState(null);
  

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*');

      if (error) {
        console.error('Error fetching data:', error);
      } else {
        setData(data);
      }
    };
    fetchData();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      {data && (
        <View>
          {data.map((item) => (
            <Text key={item.id}>{item.name}</Text>
          ))} 
        </View>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
