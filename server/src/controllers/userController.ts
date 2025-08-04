/**
 * @file User controller for the housnkuh marketplace application
 * @description User management controller with CRUD operations and security measures
 * Handles user creation, retrieval, updates, and deletion with password security
 */

import { Request, Response } from 'express';
import User from '../models/User';

/**
 * Retrieves all users from the database
 * @description Fetches all users excluding password field for security
 * @param req - Express request object
 * @param res - Express response object with user data
 * @returns Promise<void> - Resolves with user list or error message
 * @complexity O(n) where n is the number of users
 * @security Excludes password field from response
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Benutzer' });
  }
};

/**
 * Retrieves a specific user by ID
 * @description Fetches user by ID excluding password field for security
 * @param req - Express request object with user ID parameter
 * @param res - Express response object with user data
 * @returns Promise<void> - Resolves with user data or error message
 * @complexity O(1) - Single database lookup by ID
 * @security Excludes password field from response
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'Benutzer nicht gefunden' });
      return;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Benutzers' });
  }
};

/**
 * Creates a new user in the database
 * @description Creates new user with duplicate username validation and password exclusion
 * @param req - Express request object with user data
 * @param res - Express response object with created user data
 * @returns Promise<void> - Resolves with created user data or error message
 * @complexity O(1) - Single database insertion with unique constraint check
 * @security Excludes password field from response, handles duplicate username errors
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    
    // Passwort nicht in der Antwort zurückgeben
    const userResponse = savedUser.toObject() as Omit<typeof savedUser, 'password'> & { password?: string };
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as any).code === 11000) { // MongoDB Duplicate Key Error
      res.status(400).json({ message: 'Benutzername bereits vergeben' });
      return;
    }
    res.status(400).json({ message: 'Fehler beim Erstellen des Benutzers' });
  }
};

/**
 * Updates an existing user by ID
 * @description Updates user data excluding password field for security
 * @param req - Express request object with user ID parameter and update data
 * @param res - Express response object with updated user data
 * @returns Promise<void> - Resolves with updated user data or error message
 * @complexity O(1) - Single database update by ID
 * @security Prevents password updates, excludes password field from response
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Passwort aus Update-Daten entfernen, falls vorhanden
    // Passwort-Updates sollten über eine separate Route erfolgen
    const updateData = { ...req.body };
    if (updateData.password) delete updateData.password;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      res.status(404).json({ message: 'Benutzer nicht gefunden' });
      return;
    }
    
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: 'Fehler beim Aktualisieren des Benutzers' });
  }
};

/**
 * Deletes a user by ID
 * @description Permanently removes user from database with validation
 * @param req - Express request object with user ID parameter
 * @param res - Express response object with deletion confirmation
 * @returns Promise<void> - Resolves with deletion confirmation or error message
 * @complexity O(1) - Single database deletion by ID
 * @security Validates user existence before deletion
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    
    if (!deletedUser) {
      res.status(404).json({ message: 'Benutzer nicht gefunden' });
      return;
    }
    
    res.json({ message: 'Benutzer erfolgreich gelöscht' });
  } catch (err) {
    res.status(500).json({ message: 'Serverfehler beim Löschen des Benutzers' });
  }
};