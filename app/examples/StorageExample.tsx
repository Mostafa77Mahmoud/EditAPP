
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { storage, storageKeys } from '../utils/storage';
import { useLocalStorage } from '../hooks/useLocalStorage';

export const StorageExample: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [userRole, setUserRole, isLoadingRole] = useLocalStorage(storageKeys.USER_ROLE, 'user');

  const handleDirectStorage = async () => {
    try {
      await storage.setItemAsync('test_key', inputValue);
      const retrieved = await storage.getItemAsync('test_key');
      Alert.alert('Success', `Stored and retrieved: ${retrieved}`);
    } catch (error) {
      Alert.alert('Error', `Storage failed: ${error}`);
    }
  };

  const handleHookStorage = async () => {
    await setUserRole(inputValue);
    Alert.alert('Success', `User role updated to: ${inputValue}`);
  };

  if (isLoadingRole) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Storage Example</Text>
      
      <Text style={styles.label}>Current User Role: {userRole}</Text>
      
      <TextInput
        style={styles.input}
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="Enter value to store"
      />
      
      <TouchableOpacity style={styles.button} onPress={handleDirectStorage}>
        <Text style={styles.buttonText}>Test Direct Storage</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleHookStorage}>
        <Text style={styles.buttonText}>Update User Role (Hook)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
