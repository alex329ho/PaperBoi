import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

interface TimePickerModalProps {
  value?: string;
  onChange: (time: string) => void;
}

const TimePickerModal: React.FC<TimePickerModalProps> = ({ value, onChange }) => {
  const [text, setText] = useState(value || '08:00');

  const handleSave = () => onChange(text);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TextInput label="Digest time" value={text} onChangeText={setText} style={{ flex: 1 }} />
      <Button onPress={handleSave}>Save</Button>
    </View>
  );
};

export default TimePickerModal;
