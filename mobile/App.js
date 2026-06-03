import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { listSubscriptions } from './api';

export default function App() {
  const [data, setData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  

  useEffect(() => {
    const fetchData = async () => {
      try {
        const subscriptions = await listSubscriptions();
        setData(subscriptions);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        setErrorMessage(error.message);
      }
    };

    fetchData();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Subscriptions</Text>
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
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
  error: {
    color: 'red',
    marginTop: 8,
  },
});
