import { Button, View } from 'react-native';
import { useWebConnectionRN } from '../../lib/react-native-connection';

export default function HomeScreen() {
  const { sendMessage } = useWebConnectionRN();

  const handleAMessage = async () => {
    try {
      const response = await sendMessage({
        type: 'wallet',
        data: {
          address: '0x1215F2dfEd25E9352121076ef87FEB715b090320',
          value: '1000',
        },
      });
      alert('Response' + JSON.stringify(response));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Button title="Send" onPress={handleAMessage} />
      </View>
    </View>
  );
}
