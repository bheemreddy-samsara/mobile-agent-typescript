/**
 * Mobile Agent Demo App
 * Simple two-screen app for testing Mobile Agent SDK
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: {email: string};
};

const Stack = createStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{title: 'Mobile Agent Demo'}}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{headerLeft: () => null}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;

