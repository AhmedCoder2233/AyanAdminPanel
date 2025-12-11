// src/pages/AdminPanel.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../src/lib/supabaseClient";

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [productForm, setProductForm] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    product_type: "watch",
    rating: 0,
    reviews: 0,
    is_trending: false,
    image_url: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productMsg, setProductMsg] = useState("");
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState("");

  const ADMIN_PASSWORD = "admin123";

  useEffect(() => {
    const stored = localStorage.getItem("admin_logged_in");
    if (stored === "true") setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchOrders();
      fetchProducts();
    }
  }, [isLoggedIn]);

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      localStorage.setItem("admin_logged_in", "true");
      setIsLoggedIn(true);
      setPasswordInput("");
      setOrdersError("");
    } else {
      setOrdersError("Incorrect password!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_logged_in");
    setIsLoggedIn(false);
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    setOrdersError("");
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("id", { ascending: false });
      
      if (error) {
        console.error("Fetch orders error:", error);
        throw error;
      }
      
      console.log("Orders fetched:", data);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setOrdersError(`Failed to fetch orders: ${err.message || 'Unknown error'}`);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setProductsError("");
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: false });
      
      if (error) {
        console.error("Fetch products error:", error);
        throw error;
      }
      
      console.log("Products fetched:", data);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setProductsError(`Failed to fetch products: ${err.message || 'Unknown error'}`);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const markDelivered = async (orderId) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", orderId);
      
      if (error) {
        console.error("Update order error:", error);
        throw error;
      }
      
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "delivered" } : o))
      );
    } catch (err) {
      console.error("Failed to update order:", err);
      setOrdersError(`Failed to update order: ${err.message || 'Unknown error'}`);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setProductMsg("Please upload an image file (jpg, png, etc.)");
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setProductMsg("File size must be less than 10MB");
      return;
    }
    
    setUploadingImage(true);
    setProductMsg("");

    try {
      // Create a clean filename without special characters
      const fileExt = file.name.split(".").pop().toLowerCase();
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 10000);
      const fileName = `product_${timestamp}_${randomNum}.${fileExt}`;

      console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type);
      
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("ayan")
        .upload(fileName, file, { 
          cacheControl: "3600", 
          upsert: false
        });
      
      if (uploadError) {
        console.error("Upload error details:", uploadError);
        throw new Error(uploadError.message || 'Upload failed');
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("ayan")
        .getPublicUrl(fileName);

      console.log('Public URL:', urlData.publicUrl);

      setProductForm({ ...productForm, image_url: urlData.publicUrl });
      setProductMsg("Image uploaded successfully!");
    } catch (error) {
      console.error("Image upload failed:", error);
      setProductMsg(`Upload failed: ${error.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setUploadingImage(false);
    }
  };

  // Auto-generate slug
  useEffect(() => {
    if (productForm.name) {
      const random = Math.floor(Math.random() * 10000);
      const slug = productForm.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "");
      setProductForm((prev) => ({ ...prev, slug: `${slug}-${random}` }));
    }
  }, [productForm.name]);

  const handleAddProduct = async () => {
    const { name, slug, description, price, product_type, rating, reviews, is_trending, image_url } = productForm;
    if (!name || !slug || !description || !price || !product_type || !image_url) {
      setProductMsg("Please fill all required fields and upload an image.");
      return;
    }

    try {
      const { error } = await supabase.from("products").insert([{
        name,
        slug,
        description,
        price: parseFloat(price),
        product_type,
        rating: parseInt(rating) || 0,
        reviews: parseInt(reviews) || 0,
        is_trending,
        image_url,
      }]);
      
      if (error) {
        console.error("Insert product error:", error);
        throw error;
      }

      setProductMsg("Product added successfully!");
      setProductForm({
        name: "",
        slug: "",
        description: "",
        price: "",
        product_type: "watch",
        rating: 0,
        reviews: 0,
        is_trending: false,
        image_url: "",
      });
      fetchProducts();
    } catch (err) {
      console.error("Failed to add product:", err);
      setProductMsg(`Failed to add product: ${err.message || 'Unknown error'}`);
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      
      if (error) {
        console.error("Delete product error:", error);
        throw error;
      }
      
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setProductsError("Product deleted successfully!");
      setTimeout(() => setProductsError(""), 3000);
    } catch (err) {
      console.error("Failed to delete product:", err);
      setProductsError(`Failed to delete product: ${err.message || 'Unknown error'}`);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
        <div className="p-6 bg-gray-900 rounded-lg border border-amber-500/20 w-full max-w-sm">
          <h2 className="text-xl font-bold mb-4 text-center">Admin Login</h2>
          <input
            type="password"
            placeholder="Enter password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-3 py-2 mb-4 rounded bg-black/40 border border-amber-500/20 text-white"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-amber-400 text-black py-2 rounded font-semibold hover:brightness-90"
          >
            Login
          </button>
          {ordersError && <p className="text-red-500 mt-2 text-center">{ordersError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6 flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 px-3 py-1 rounded font-semibold hover:brightness-90"
        >
          Logout
        </button>
      </div>

      {/* Orders Section */}
      <div className="bg-gray-900 p-4 rounded-lg border border-amber-500/20 space-y-4 overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">Orders</h2>
        {loadingOrders ? (
          <p>Loading orders...</p>
        ) : ordersError ? (
          <p className="text-red-500">{ordersError}</p>
        ) : orders.length === 0 ? (
          <p>No orders found.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((o) => (
              <div key={o.id} className="bg-black/50 p-4 rounded-lg border border-amber-500/20 space-y-2">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="font-bold">Order #{o.id}</span>
                  <span className={`font-semibold ${o.status === "delivered" ? "text-green-400" : "text-amber-400"}`}>
                    {o.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <p><span className="font-semibold">Name:</span> {o.full_name}</p>
                  <p><span className="font-semibold">Email:</span> {o.email}</p>
                  <p><span className="font-semibold">Phone:</span> {o.phone}</p>
                  <p><span className="font-semibold">City:</span> {o.city}</p>
                  <p><span className="font-semibold">Postal:</span> {o.postal_code}</p>
                  <p><span className="font-semibold">Payment:</span> {o.payment_method}</p>
                  <p><span className="font-semibold">Created:</span> {new Date(o.created_at).toLocaleString()}</p>
                  <p><span className="font-semibold">Subtotal:</span> ${o.subtotal}</p>
                  <p><span className="font-semibold">Delivery Fee:</span> ${o.delivery_fee}</p>
                  <p><span className="font-semibold">Total:</span> ${o.total}</p>
                </div>

                <div><span className="font-semibold">Address:</span> {o.address}</div>

                <div>
                  <span className="font-semibold">Items:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Array.isArray(o.items) && o.items.map((item, idx) => (
                      <div key={item.id || idx} className="bg-gray-800 p-2 rounded flex items-center gap-2 min-w-[150px]">
                        <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded" />
                        <div className="text-sm">
                          <p className="font-semibold">{item.name}</p>
                          <p>{item.quantity}x - ${item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {o.status !== "delivered" && (
                  <button
                    onClick={() => markDelivered(o.id)}
                    className="mt-2 bg-green-600 px-3 py-1 rounded text-white font-semibold hover:brightness-90"
                  >
                    Mark Delivered
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Products Section */}
      <div className="bg-gray-900 p-4 rounded-lg border border-amber-500/20 space-y-4 overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">All Products</h2>
        {loadingProducts ? (
          <p>Loading products...</p>
        ) : productsError && !productsError.includes('successfully') ? (
          <p className="text-red-500">{productsError}</p>
        ) : products.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <div>
            {productsError && productsError.includes('successfully') && (
              <p className="text-green-400 mb-4">{productsError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div key={product.id} className="bg-black/50 p-4 rounded-lg border border-amber-500/20 space-y-3">
                  <div className="relative">
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="w-full h-48 object-cover rounded"
                    />
                    <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${product.product_type === 'watch' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                      {product.product_type}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg">{product.name}</h3>
                    <p className="text-sm text-gray-400">{product.slug}</p>
                  </div>
                  
                  <p className="text-sm text-gray-300 line-clamp-2">{product.description}</p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-amber-400 font-bold text-lg">${product.price}</span>
                    <div className="text-sm">
                      <span className="text-amber-400">★ {product.rating}</span>
                      <span className="text-gray-400"> ({product.reviews})</span>
                    </div>
                  </div>
                  
                  {product.is_trending && (
                    <span className="inline-block bg-amber-500 text-black px-2 py-1 rounded text-xs font-semibold">
                      Trending
                    </span>
                  )}
                  
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="w-full bg-red-600 text-white px-3 py-2 rounded font-semibold hover:brightness-90"
                  >
                    Delete Product
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Product Section */}
      <div className="bg-gray-900 p-4 rounded-lg border border-amber-500/20 overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">Add Product</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-1 sm:col-span-2">
            <label className="block mb-2 font-semibold">Upload Image</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-amber-400 file:text-black file:font-semibold hover:file:brightness-90 file:cursor-pointer"
            />
            {uploadingImage && <p className="text-amber-400 mt-2">Uploading image...</p>}
            {productForm.image_url && (
              <div className="mt-2">
                <p className="text-green-400 mb-2">Image uploaded successfully!</p>
                <img src={productForm.image_url} alt="Preview" className="w-32 h-32 object-cover rounded border border-amber-500/20" />
              </div>
            )}
          </div>

          <div>
            <label className="block mb-1 font-semibold">Name</label>
            <input
              type="text"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/20 text-white"
              placeholder="Product name"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Slug (auto-generated)</label>
            <input
              type="text"
              value={productForm.slug}
              readOnly
              className="w-full px-3 py-2 rounded bg-black/30 border border-amber-500/20 cursor-not-allowed text-gray-400"
            />
          </div>

          <div className="col-span-1 sm:col-span-2">
            <label className="block mb-1 font-semibold">Description</label>
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/20 text-white"
              rows="3"
              placeholder="Product description"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={productForm.price}
              onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
              className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/20 text-white"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Product Type</label>
            <select
              value={productForm.product_type}
              onChange={(e) => setProductForm({ ...productForm, product_type: e.target.value })}
              className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/20 text-white"
            >
              <option value="watch">Watch</option>
              <option value="jewelry">Jewelry</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Rating (0-5)</label>
            <input
              type="number"
              min="0"
              max="5"
              value={productForm.rating}
              onChange={(e) => setProductForm({ ...productForm, rating: e.target.value })}
              className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/20 text-white"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Number of Reviews</label>
            <input
              type="number"
              min="0"
              value={productForm.reviews}
              onChange={(e) => setProductForm({ ...productForm, reviews: e.target.value })}
              className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/20 text-white"
            />
          </div>

          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              id="trending"
              checked={productForm.is_trending}
              onChange={(e) => setProductForm({ ...productForm, is_trending: e.target.checked })}
              className="w-4 h-4 accent-amber-500"
            />
            <label htmlFor="trending" className="font-semibold">Mark as Trending</label>
          </div>
        </div>

        <button
          onClick={handleAddProduct}
          className="mt-6 bg-amber-400 text-black px-6 py-2 rounded font-semibold hover:brightness-90"
        >
          Add Product
        </button>
        {productMsg && (
          <p className={`mt-2 ${productMsg.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
            {productMsg}
          </p>
        )}
      </div>
    </div>
  );
}
