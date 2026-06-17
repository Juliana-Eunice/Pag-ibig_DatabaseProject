package com.pagibig;

import java.awt.*;
import javax.swing.*;

public class LoginFrame extends JFrame {
    private final JTextField usernameField;
    private final JPasswordField passwordField;
    private final JLabel infoLabel;

    public LoginFrame() {
        setTitle("Pag-IBIG Fund Admin Login");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(420, 340);
        setLocationRelativeTo(null);
        setResizable(false);

        JPanel content = new JPanel();
        content.setBorder(BorderFactory.createEmptyBorder(20, 24, 20, 24));
        content.setLayout(new BorderLayout(0, 20));
        setContentPane(content);

        JLabel titleLabel = new JLabel("Pag-IBIG Fund Admin Portal", SwingConstants.CENTER);
        titleLabel.setFont(new Font("SansSerif", Font.BOLD, 18));
        content.add(titleLabel, BorderLayout.NORTH);

        JPanel formPanel = new JPanel();
        formPanel.setLayout(new GridBagLayout());
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(10, 0, 10, 0);
        gbc.anchor = GridBagConstraints.WEST;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.gridx = 0;
        gbc.gridy = 0;

        formPanel.add(new JLabel("Username"), gbc);
        gbc.gridy++;
        usernameField = new JTextField();
        formPanel.add(usernameField, gbc);
        gbc.gridy++;

        formPanel.add(new JLabel("Password"), gbc);
        gbc.gridy++;
        passwordField = new JPasswordField();
        formPanel.add(passwordField, gbc);
        gbc.gridy++;

        infoLabel = new JLabel(" ");
        infoLabel.setForeground(Color.RED);
        formPanel.add(infoLabel, gbc);

        content.add(formPanel, BorderLayout.CENTER);

        JButton loginButton = new JButton("Log In");
        loginButton.setFont(new Font("SansSerif", Font.BOLD, 14));
        loginButton.addActionListener(e -> attemptLogin());

        JButton exitButton = new JButton("Exit");
        exitButton.addActionListener(e -> System.exit(0));

        JPanel buttonBar = new JPanel(new FlowLayout(FlowLayout.CENTER, 14, 0));
        buttonBar.add(loginButton);
        buttonBar.add(exitButton);
        content.add(buttonBar, BorderLayout.SOUTH);
    }

    private void attemptLogin() {
        String username = usernameField.getText().trim();
        String password = new String(passwordField.getPassword());

        if ("admin" .equals(username) && "grp3db.IM" .equals(password)) {
            DashboardFrame dashboard = new DashboardFrame(new DataStore());
            dashboard.setVisible(true);
            dispose();
        } else {
            infoLabel.setText("Invalid username or password.");
            passwordField.setText("");
        }
    }
}
