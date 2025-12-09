import React, { useState } from 'react';
import { Button, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Spacing } from '@utils/spacing';
import { Colors } from '@utils/colors';

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (time: string) => void;
}

const TimePickerModal: React.FC<TimePickerModalProps> = ({ visible, onClose, onConfirm }) => {
  const [date, setDate] = useState(new Date());

  const onChange = (_: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setDate(currentDate);
  };

  const confirm = () => {
    const timeString = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    onConfirm(timeString);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Select digest time</Text>
          <DateTimePicker
            value={date}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
            onChange={onChange}
          />
          <View style={styles.actions}>
            <Button title="Cancel" onPress={onClose} />
            <Button title="Save" onPress={confirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center'
  },
  container: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: '#fff',
    borderRadius: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.md,
    color: Colors.text
  },
  actions: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
});

export default TimePickerModal;
