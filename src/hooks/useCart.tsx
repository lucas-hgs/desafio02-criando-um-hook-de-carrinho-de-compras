import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const {data: stock} = await api.get<Stock>(`stock/${productId}`);

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      const stockAmount = stock.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExists) {
        productExists.amount = amount;
      } else {
        const {data: product} = await api.get<Product>(`products/${productId}`);

        const newProduct = {
          ...product,
          amount: 1
        }

        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const searchCart = [...cart];
      const productExists = searchCart.find(product => product.id === productId);

      if(productExists) {
        const removedProduct = searchCart.filter(product => productId !== product.id);
        setCart(removedProduct);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(removedProduct));
      } else {
        toast.error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) {
        toast.error('Erro na alteração de quantidade do produto');
        return
      }

      const {data: stock} = await api.get<Stock>(`stock/${productId}`);
      const productAmount = stock.amount;
      const productAvailable = amount > productAmount;

      if(productAvailable) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const productExists = cart.find(product => product.id === productId);

      if(!productExists) {
        toast.error('Erro na alteração de quantidade do produto');
        return
      }

      const updateCartValue = cart.map(product => product.id === productId ? {
        ...product,
        amount: amount,
      } : product);
      setCart(updateCartValue);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCartValue));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
