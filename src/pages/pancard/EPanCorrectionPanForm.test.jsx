import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import EPanCorrectionPanForm from './EPanCorrectionPanForm';

describe('EPanCorrectionPanForm', () => {
  test('shows the required PAN correction inputs and keeps submit disabled until valid data is entered', () => {
    render(<EPanCorrectionPanForm />);

    expect(screen.getByLabelText(/PAN Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Middle Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Middle Name/i)).not.toBeRequired();
    expect(screen.getByRole('button', { name: 'Submit Correction' })).toBeDisabled();
  });

  test('validates PAN format and enables submit only after all required fields are valid', () => {
    const handleSubmit = jest.fn();
    const outerFormSubmit = jest.fn();
    render(
      <form onSubmit={(event) => {
        event.preventDefault();
        outerFormSubmit();
      }}>
        <EPanCorrectionPanForm onSubmit={handleSubmit} />
      </form>
    );

    const panInput = screen.getByLabelText(/PAN Number/i);
    const titleInput = screen.getByLabelText(/Title/i);
    const firstNameInput = screen.getByLabelText(/First Name/i);
    const lastNameInput = screen.getByLabelText(/Last Name/i);
    const dobInput = screen.getByLabelText(/Date of Birth/i);
    const mobileInput = screen.getByLabelText(/Mobile Number/i);
    const emailInput = screen.getByLabelText(/Email Address/i);

    fireEvent.change(panInput, { target: { value: 'abcde1234f' } });
    expect(panInput).toHaveValue('ABCDE1234F');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.change(panInput, { target: { value: 'ABCDE12345' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid PAN in the format ABCDE1234F.');

    fireEvent.change(panInput, { target: { value: 'ABCDE1234F' } });
    fireEvent.change(titleInput, { target: { value: '1' } });
    fireEvent.change(firstNameInput, { target: { value: 'Ram' } });
    fireEvent.change(lastNameInput, { target: { value: 'Raja' } });
    fireEvent.change(dobInput, { target: { value: '1995-05-20' } });
    fireEvent.change(mobileInput, { target: { value: '9876543210' } });
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    expect(screen.getByRole('button', { name: 'Submit Correction' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Correction' }));
    expect(handleSubmit).toHaveBeenCalledWith({
      panNumber: 'ABCDE1234F',
      title: '1',
      firstName: 'Ram',
      middleName: '',
      lastName: 'Raja',
      dob: '1995-05-20',
      dateofbirth: '20/05/1995',
      mobileNumber: '9876543210',
      email: 'user@example.com',
      providerFields: {
        title: '1',
        lastname: 'Raja',
        firstname: 'Ram',
        middlename: '',
        dateofbirth: '20/05/1995',
        mobileno: '9876543210',
        emailid: 'user@example.com',
        pan: 'ABCDE1234F'
      }
    });
    expect(outerFormSubmit).not.toHaveBeenCalled();
  });

  test('enforces the documented name and email limits', () => {
    const handleSubmit = jest.fn();
    render(<EPanCorrectionPanForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/PAN Number/i), { target: { value: 'ABCDE1234F' } });
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'shri' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'A'.repeat(26) } });

    expect(screen.getByRole('button', { name: 'Submit Correction' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Name fields cannot exceed 25 characters.');
  });
});
