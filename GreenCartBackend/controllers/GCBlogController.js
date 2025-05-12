const Blog = require('../models/Blog');
const { v2: cloudinary } = require("cloudinary");
const User = require('../models/User');
const mongoose = require("mongoose");
const multer = require("multer");
const Notification = require("../models/NotificationModel");

// Create a Blog
exports.createBlog = async (req, res) => {
  try {
    const { userId, title, description, datePublished } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required." });
    }

    const publishedDate = datePublished ? new Date(datePublished) : new Date();
    const imageUrls = req.files?.map(file => file.path) || [];

    const blog = new Blog({ title, description, userId, datePublished: publishedDate, images: imageUrls });
    await blog.save();

    await Notification.create({
      message: `New blog added: "${blog.title}" has been published.`,
      type: "new_blog",
      actionBy: req.user.id,
    });
    
    res.status(201).json({ message: "✅ Blog created successfully!", blog });
  } catch (error) {
    console.error("🚨 Blog Creation Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// Read All Blogs
exports.getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find();
    res.status(200).json(blogs);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all blog posts with user details
exports.getAllBlogsFrontend = async (req, res) => {
  try {
    const blogs = await Blog.find().populate("userId", "name email");
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching blogs", error: error.message });
  }
};

// Read a Blog by ID
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.status(200).json(blog);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update a Blog
exports.updateBlog = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized access." });
    
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    
    let updateFields = { ...req.body };
    
    const existingImages = blog.images || [];
    const newImages = req.body.images || [];
    const imagesToDelete = existingImages.filter(img => !newImages.includes(img));
    
    if (imagesToDelete.length > 0) {
      for (const imageUrl of imagesToDelete) {
        try {
          const publicId = imageUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`GreenCart/${publicId}`);
        } catch (err) {
          console.error("Error deleting image:", imageUrl, err);
        }
      }
    }

    if (req.files && req.files.length > 0) {
      const uploadedImages = [];
      for (const file of req.files) {
        try {
          const result = await cloudinary.uploader.upload(file.path, { folder: "GreenCart" });
          uploadedImages.push(result.secure_url);
        } catch (uploadError) {
          return res.status(500).json({ error: "Failed to upload image to Cloudinary." });
        }
      }
      updateFields.images = [...newImages, ...uploadedImages];
    }

    const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    await Notification.create({
      message: `Blog updated: "${updatedBlog.title}" has been modified.`,
      type: "update_blog",
      actionBy: req.user.id,
    });
    
    res.status(200).json({ message: "Blog updated successfully", blog: updatedBlog });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Failed to update blog" });
  }
};

// Delete a Blog
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    
    if (blog.images && blog.images.length > 0) {
      for (const imageUrl of blog.images) {
        try {
          const publicId = imageUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`GreenCart/${publicId}`);
        } catch (err) {
          console.error("Error deleting image:", imageUrl, err);
        }
      }
    }

    await Blog.findByIdAndDelete(req.params.id);
    await Notification.create({
      message: `Blog deleted: "${blog.title}" has been removed from the platform.`,
      type: "blog_deleted",
      actionBy: req.user.id,
    });
    
    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete blog" });
  }
};

// Like / Unlike a Blog
exports.likeBlog = async (req, res) => {
  try {
    const { userId } = req.body;
    const blog = await Blog.findById(req.params.id);

    if (!blog) return res.status(404).json({ message: "Blog not found" });
    
    blog.likes = blog.likes.includes(userId) 
      ? blog.likes.filter((id) => id.toString() !== userId) 
      : [...blog.likes, userId];

    await blog.save();
    res.status(200).json({ message: "Like updated", likes: blog.likes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add a Comment to a Blog
exports.commentBlog = async (req, res) => {
  try {
    const { userId, text } = req.body;
    const blog = await Blog.findById(req.params.id);

    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.comments.push({ userId, text });
    await blog.save();

    res.status(201).json({ message: "Comment added", comments: blog.comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};