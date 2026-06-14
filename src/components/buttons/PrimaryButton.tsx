import React from 'react';
import { AppButton, AppButtonProps } from './AppButton';

export const PrimaryButton: React.FC<Omit<AppButtonProps, 'variant'>> = (props) => {
  return <AppButton {...props} variant="primary" />;
};
