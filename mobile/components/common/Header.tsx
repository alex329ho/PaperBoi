import React from 'react';
import { Appbar } from 'react-native-paper';

interface HeaderProps {
  title: string;
  onBack?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onBack }) => (
  <Appbar.Header>
    {onBack ? <Appbar.BackAction onPress={onBack} /> : null}
    <Appbar.Content title={title} />
  </Appbar.Header>
);

export default Header;
