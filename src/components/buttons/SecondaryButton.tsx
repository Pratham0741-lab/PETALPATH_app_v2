import React from 'react';
import { AppButton, AppButtonProps } from './AppButton';

export const SecondaryButton: React.FC<Omit<AppButtonProps, 'variant'>> = (props) => {
  return <AppButton {...props} variant="secondary" />;
};
